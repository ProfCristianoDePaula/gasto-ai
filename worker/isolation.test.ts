import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp, DELETE_DATA_CONFIRMATION_TEXT } from './app';
import {
  deleteExpense,
  getExpenseById,
  insertExpense,
  listBudgets,
  listCategories,
  listExpenses,
  updateExpense,
  upsertBudget,
  upsertMerchantRule,
  findMerchantRule,
} from './db';

const SUPABASE_URL = 'https://exemplo.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;

/**
 * Adaptador mínimo de `D1Database` sobre `node:sqlite` (`DatabaseSync`)
 * para executar testes reais contra o schema `/migrations/0001_init.sql`.
 */
function createSqliteD1(sqlite: DatabaseSync): D1Database {
  const makePrepared = (sql: string, boundArgs: unknown[] = []): D1PreparedStatement => ({
    bind(...values: unknown[]) {
      return makePrepared(sql, values);
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const stmt = sqlite.prepare(sql);
      const row = stmt.get(...(boundArgs as never[])) as Record<string, unknown> | undefined;
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
  } as unknown as D1PreparedStatement);

  return {
    prepare(query: string) {
      return makePrepared(query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const results: D1Result<T>[] = [];
      for (const s of statements) {
        results.push(await s.run<T>());
      }
      return results;
    },
    async exec(query: string): Promise<D1ExecResult> {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    async dump(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0);
    },
    withSession() {
      return this as unknown as D1DatabaseSession;
    },
  } as unknown as D1Database;
}

/**
 * Bucket R2 em memória para comprovar que `DELETE /api/me/data` do usuário B
 * não remove objetos pertencentes ao usuário A.
 */
function createMemoryR2(initialKeys: string[]) {
  const keys = new Set(initialKeys);

  const bucket = {
    async list(options?: R2ListOptions) {
      const prefix = options?.prefix ?? '';
      const matched = Array.from(keys)
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key }) as R2Object);
      return {
        objects: matched,
        truncated: false,
        delimitedPrefixes: [],
      } as unknown as R2Objects;
    },
    async delete(keysOrKey: string | string[]) {
      const list = Array.isArray(keysOrKey) ? keysOrKey : [keysOrKey];
      for (const k of list) {
        keys.delete(k);
      }
    },
  } as unknown as R2Bucket;

  return { bucket, keys };
}

test('Isolamento multi-tenant: usuário B não lê, altera nem apaga dados do usuário A', async () => {
  const sqlite = new DatabaseSync(':memory:');
  const migrationSql = readFileSync(
    resolve(process.cwd(), 'migrations/0001_init.sql'),
    'utf8'
  );
  sqlite.exec(migrationSql);
  const db = createSqliteD1(sqlite);

  // Gera par de chaves JWKS para assinar tokens reais de Usuário A e Usuário B
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'isolation-key';
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  const app = createApp({ jwksOverride: createLocalJWKSet({ keys: [jwk] }) });

  const signToken = (sub: string, email: string) =>
    new SignJWT({ email, role: 'authenticated' })
      .setProtectedHeader({ alg: 'RS256', kid: 'isolation-key' })
      .setSubject(sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

  const userA = 'user-a-uuid';
  const userB = 'user-b-uuid';
  const tokenA = await signToken(userA, 'a@teste.com');
  const tokenB = await signToken(userB, 'b@teste.com');

  const r2 = createMemoryR2([
    `${userA}/receipt-1.jpg`,
    `${userB}/receipt-2.jpg`,
  ]);

  const env = {
    DB: db,
    RECEIPTS: r2.bucket,
    SUPABASE_URL,
    APP_TIMEZONE: 'America/Sao_Paulo',
  };

  // 1. Sem token ou token inválido -> 401 genérico
  const unauthRes = await app.request('/api/me', undefined, env);
  assert.equal(unauthRes.status, 401);

  // 2. Primeiro acesso autenticado cria 5 categorias padrão isoladas por user_id
  const meARes = await app.request(
    '/api/me',
    { headers: { Authorization: `Bearer ${tokenA}` } },
    env
  );
  assert.equal(meARes.status, 200);
  const meABody = (await meARes.json()) as {
    user: { id: string };
    categories: Array<{ id: string; user_id: string; name: string }>;
  };
  assert.equal(meABody.user.id, userA);
  assert.equal(meABody.categories.length, 5);
  assert.ok(meABody.categories.every((c) => c.user_id === userA));

  const meBRes = await app.request(
    '/api/me',
    { headers: { Authorization: `Bearer ${tokenB}` } },
    env
  );
  assert.equal(meBRes.status, 200);
  const meBBody = (await meBRes.json()) as {
    user: { id: string };
    categories: Array<{ id: string; user_id: string; name: string }>;
  };
  assert.equal(meBBody.user.id, userB);
  assert.equal(meBBody.categories.length, 5);
  assert.ok(meBBody.categories.every((c) => c.user_id === userB));

  // 3. Popula despesa, orçamento e regra do Usuário A e uma despesa do Usuário B
  const catA = meABody.categories[0]!;
  const catB = meBBody.categories[0]!;

  const expenseA = await insertExpense(db, userA, {
    amountCents: 4590,
    expenseDate: '2026-11-14',
    merchant: 'Padaria do A',
    categoryId: catA.id,
    source: 'manual',
    imageKey: `${userA}/receipt-1.jpg`,
  });
  await upsertBudget(db, userA, catA.id, 50000);
  await upsertMerchantRule(db, userA, 'Padaria do A', catA.id);

  await insertExpense(db, userB, {
    amountCents: 1990,
    expenseDate: '2026-11-14',
    merchant: 'Café do B',
    categoryId: catB.id,
    source: 'manual',
    imageKey: `${userB}/receipt-2.jpg`,
  });

  // 4. Usuário B não consegue ler, atualizar ou excluir a despesa de A
  assert.equal(await getExpenseById(db, userB, expenseA.id), null);
  assert.equal(
    await updateExpense(db, userB, expenseA.id, { amountCents: 100 }),
    null
  );
  assert.equal(await deleteExpense(db, userB, expenseA.id), false);

  const expensesB = await listExpenses(db, userB);
  assert.equal(expensesB.length, 1);
  assert.equal(expensesB[0]?.merchant, 'Café do B');
  assert.equal((await listBudgets(db, userB)).length, 0);
  assert.equal(await findMerchantRule(db, userB, 'Padaria do A'), null);

  // 5. DELETE /api/me/data exige confirmação textual exata
  const badConfirmRes = await app.request(
    '/api/me/data',
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: 'apagar' }),
    },
    env
  );
  assert.equal(badConfirmRes.status, 400);

  // 6. Usuário B apaga seus próprios dados -> dados e R2 do Usuário A continuam intactos
  const deleteBRes = await app.request(
    '/api/me/data',
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${tokenB}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ confirmation: DELETE_DATA_CONFIRMATION_TEXT }),
    },
    env
  );
  assert.equal(deleteBRes.status, 200);
  const deleteBJson = (await deleteBRes.json()) as {
    ok: boolean;
    deleted: { expenses: number; receiptImages: number };
  };
  assert.equal(deleteBJson.ok, true);
  assert.equal(deleteBJson.deleted.expenses, 1);
  assert.equal(deleteBJson.deleted.receiptImages, 1);

  // Usuário B ficou sem despesas e sem seu objeto R2
  assert.equal((await listExpenses(db, userB)).length, 0);
  assert.equal(r2.keys.has(`${userB}/receipt-2.jpg`), false);

  // Usuário A mantém 100% dos seus dados, categorias, orçamentos, regras e imagem R2
  assert.equal((await listExpenses(db, userA)).length, 1);
  assert.equal((await listCategories(db, userA)).length, 5);
  assert.equal((await listBudgets(db, userA)).length, 1);
  assert.ok(await findMerchantRule(db, userA, 'Padaria do A'));
  assert.equal(r2.keys.has(`${userA}/receipt-1.jpg`), true);
});
