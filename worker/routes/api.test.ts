import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../app';

const SUPABASE_URL = 'https://exemplo.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;

function createSqliteD1(sqlite: DatabaseSync): D1Database {
  const makePrepared = (sql: string, boundArgs: unknown[] = []): D1PreparedStatement =>
    ({
      bind(...values: unknown[]) {
        return makePrepared(sql, values);
      },
      async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
        const stmt = sqlite.prepare(sql);
        const row = stmt.get(...(boundArgs as never[])) as
          | Record<string, unknown>
          | undefined;
        if (!row) return null;
        if (colName) return (row[colName] as T) ?? null;
        return row as T;
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(sql);
        const info = stmt.run(...(boundArgs as never[]));
        return {
          results: [],
          success: true,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: 0,
            rows_written: Number(info.changes ?? 0),
            last_row_id: Number(info.lastInsertRowid ?? 0),
            changed_db: Number(info.changes ?? 0) > 0,
            changes: Number(info.changes ?? 0),
          },
        };
      },
      async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const stmt = sqlite.prepare(sql);
        const rows = stmt.all(...(boundArgs as never[])) as T[];
        return {
          results: rows,
          success: true,
          meta: {
            duration: 0,
            size_after: 0,
            rows_read: rows.length,
            rows_written: 0,
            last_row_id: 0,
            changed_db: false,
            changes: 0,
          },
        };
      },
      async raw<T = unknown[]>(): Promise<T[]> {
        const stmt = sqlite.prepare(sql);
        const rows = stmt.all(...(boundArgs as never[])) as Record<string, unknown>[];
        return rows.map((r) => Object.values(r)) as T[];
      },
    }) as unknown as D1PreparedStatement;

  return {
    prepare(query: string) {
      return makePrepared(query);
    },
    async batch<T = unknown>(
      statements: D1PreparedStatement[]
    ): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const s of statements) {
        results.push(await s.run<T>());
      }
      return results;
    },
  } as unknown as D1Database;
}

test('CRUD completo de despesas, categorias, orçamentos, dashboard SQL, cursor e export.csv', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const migrationSql = readFileSync(
    resolve(process.cwd(), 'migrations/0001_init.sql'),
    'utf8'
  );
  sqlite.exec(migrationSql);
  const db = createSqliteD1(sqlite);

  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'crud-key';
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  const app = createApp({ jwksOverride: createLocalJWKSet({ keys: [jwk] }) });

  const signToken = (sub: string, email: string) =>
    new SignJWT({ email, role: 'authenticated' })
      .setProtectedHeader({ alg: 'RS256', kid: 'crud-key' })
      .setSubject(sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

  const tokenA = await signToken('user-a', 'a@teste.com');
  const tokenB = await signToken('user-b', 'b@teste.com');
  const env = { DB: db, SUPABASE_URL, APP_TIMEZONE: 'America/Sao_Paulo' };

  const authHeadersA = {
    Authorization: `Bearer ${tokenA}`,
    'Content-Type': 'application/json',
  };
  const authHeadersB = {
    Authorization: `Bearer ${tokenB}`,
    'Content-Type': 'application/json',
  };

  // 1. Categorias: GET cria 5 padrão, POST cria personalizada, PATCH renomeia
  const catsRes = await app.request(
    '/api/categories',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(catsRes.status, 200);
  const catsJson = (await catsRes.json()) as {
    categories: Array<{ id: string; name: string; is_default: number }>;
  };
  assert.equal(catsJson.categories.length, 5);

  const defaultFood = catsJson.categories.find((c) => c.name === 'Alimentação')!;

  const createCatRes = await app.request(
    '/api/categories',
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({ name: 'Saúde', icon: 'heart', color: '#10b981' }),
    },
    env
  );
  assert.equal(createCatRes.status, 201);
  const createdCat = (
    (await createCatRes.json()) as { category: { id: string; name: string } }
  ).category;

  const patchCatRes = await app.request(
    `/api/categories/${createdCat.id}`,
    {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ name: 'Saúde & Bem-estar' }),
    },
    env
  );
  assert.equal(patchCatRes.status, 200);

  // Categoria padrão não pode ser excluída
  const delDefaultRes = await app.request(
    `/api/categories/${defaultFood.id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(delDefaultRes.status, 400);

  // 2. Orçamentos: PUT total e por categoria
  const putBudgetTotal = await app.request(
    '/api/budgets',
    {
      method: 'PUT',
      headers: authHeadersA,
      body: JSON.stringify({ categoryId: null, amountCents: 200000 }),
    },
    env
  );
  assert.equal(putBudgetTotal.status, 200);

  const putBudgetFood = await app.request(
    '/api/budgets',
    {
      method: 'PUT',
      headers: authHeadersA,
      body: JSON.stringify({ categoryId: defaultFood.id, amountCents: 50000 }),
    },
    env
  );
  assert.equal(putBudgetFood.status, 200);

  // 3. Despesas: POST (outubro e novembro), PATCH, filtros, cursor e CSV
  const expOctRes = await app.request(
    '/api/expenses',
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        amountCents: 10000,
        expenseDate: '2026-10-15',
        merchant: 'Mercado Outubro',
        categoryId: defaultFood.id,
        source: 'manual',
      }),
    },
    env
  );
  assert.equal(expOctRes.status, 201);

  const expNov1Res = await app.request(
    '/api/expenses',
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        amountCents: 15050,
        expenseDate: '2026-11-10',
        merchant: 'Padaria Central; Filial',
        categoryId: defaultFood.id,
        notes: 'Café da manhã',
        source: 'manual',
      }),
    },
    env
  );
  assert.equal(expNov1Res.status, 201);
  const expNov1 = (
    (await expNov1Res.json()) as { expense: { id: string } }
  ).expense;

  const expNov2Res = await app.request(
    '/api/expenses',
    {
      method: 'POST',
      headers: authHeadersA,
      body: JSON.stringify({
        amountCents: 4950,
        expenseDate: '2026-11-12',
        merchant: 'Farmácia =Teste',
        categoryId: createdCat.id,
        source: 'manual',
      }),
    },
    env
  );
  assert.equal(expNov2Res.status, 201);

  // Paginação por cursor (limit=1)
  const page1Res = await app.request(
    '/api/expenses?from=2026-11-01&to=2026-11-30&limit=1',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(page1Res.status, 200);
  const page1 = (await page1Res.json()) as {
    items: Array<{ id: string; merchant: string }>;
    nextCursor: string | null;
    totalCount: number;
    totalCents: number;
  };
  assert.equal(page1.items.length, 1);
  assert.equal(page1.totalCount, 2);
  assert.equal(page1.totalCents, 20000);
  assert.ok(page1.nextCursor);

  const page2Res = await app.request(
    `/api/expenses?from=2026-11-01&to=2026-11-30&limit=1&cursor=${encodeURIComponent(page1.nextCursor!)}`,
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  const page2 = (await page2Res.json()) as {
    items: Array<{ id: string }>;
    nextCursor: string | null;
  };
  assert.equal(page2.items.length, 1);
  assert.notEqual(page2.items[0]!.id, page1.items[0]!.id);
  assert.equal(page2.nextCursor, null);

  // Filtro por q e min/max
  const filteredRes = await app.request(
    '/api/expenses?q=Padaria&min=10000&max=20000',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  const filtered = (await filteredRes.json()) as {
    items: Array<{ id: string }>;
  };
  assert.equal(filtered.items.length, 1);
  assert.equal(filtered.items[0]!.id, expNov1.id);

  // PATCH e isolamento do Usuário B
  const patchB = await app.request(
    `/api/expenses/${expNov1.id}`,
    {
      method: 'PATCH',
      headers: authHeadersB,
      body: JSON.stringify({ amountCents: 100 }),
    },
    env
  );
  assert.equal(patchB.status, 404);

  const patchA = await app.request(
    `/api/expenses/${expNov1.id}`,
    {
      method: 'PATCH',
      headers: authHeadersA,
      body: JSON.stringify({ amountCents: 15500 }),
    },
    env
  );
  assert.equal(patchA.status, 200);

  // Dashboard SQL agregado para 2026-11: Nov = 15500 + 4950 = 20450; Out = 10000 -> variação +104.5%
  const dashRes = await app.request(
    '/api/dashboard?month=2026-11',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(dashRes.status, 200);
  const dash = (await dashRes.json()) as {
    totalCents: number;
    previousMonthTotalCents: number;
    variationPct: number;
    dailySeries: Array<{ date: string; totalCents: number }>;
    categories: Array<{ name: string; spentCents: number; sharePct: number }>;
    recentExpenses: Array<{ id: string }>;
    budgetStatus: { totalLimitCents: number; spentCents: number };
  };
  assert.equal(dash.totalCents, 20450);
  assert.equal(dash.previousMonthTotalCents, 10000);
  assert.equal(dash.variationPct, 104.5);
  assert.equal(dash.dailySeries.length, 30);
  assert.equal(
    dash.dailySeries.find((d) => d.date === '2026-11-10')?.totalCents,
    15500
  );
  assert.equal(dash.recentExpenses.length, 2);
  assert.equal(dash.budgetStatus.totalLimitCents, 200000);
  assert.equal(dash.budgetStatus.spentCents, 20450);

  // Export CSV com BOM UTF-8, separador `;` e proteção contra formula injection
  const csvRes = await app.request(
    '/api/expenses/export.csv?month=2026-11',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(csvRes.status, 200);
  assert.match(csvRes.headers.get('content-type') ?? '', /text\/csv/);
  const csvBytes = new Uint8Array(await csvRes.arrayBuffer());
  assert.deepEqual(Array.from(csvBytes.slice(0, 3)), [0xef, 0xbb, 0xbf]);
  const csvText = new TextDecoder('utf-8').decode(csvBytes);
  assert.match(csvText, /Data;Estabelecimento;Categoria;Valor \(R\$\)/);
  assert.match(csvText, /10\/11\/2026;"Padaria Central; Filial";Alimentação;155,00/);
  assert.match(csvText, /12\/11\/2026;Farmácia =Teste/);

  // Excluir categoria personalizada move despesas para Outros e remove categoria
  const delCatRes = await app.request(
    `/api/categories/${createdCat.id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(delCatRes.status, 200);

  // DELETE despesa
  const delExpRes = await app.request(
    `/api/expenses/${expNov1.id}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(delExpRes.status, 200);
});
