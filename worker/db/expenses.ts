/**
 * Helpers de acesso ao D1 para a tabela `expenses`.
 * TODA consulta filtra explicitamente por `user_id` com prepared statements.
 */

export type ExpenseSource = 'image' | 'text' | 'voice' | 'manual';

export interface ExpenseRow {
  id: string;
  user_id: string;
  amount_cents: number;
  expense_date: string;
  merchant: string | null;
  category_id: string | null;
  notes: string | null;
  source: ExpenseSource;
  image_key: string | null;
  thumbnail: string | null;
  ai_confidence: number | null;
  ai_raw: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithCategoryRow extends ExpenseRow {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

export interface ExpenseCursor {
  d: string; // expense_date
  c: string; // created_at
  i: string; // id
}

export interface ListExpensesFilter {
  month?: string; // YYYY-MM
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  categoryId?: string;
  search?: string;
  minCents?: number;
  maxCents?: number;
  cursor?: ExpenseCursor;
  limit?: number;
}

export interface PaginatedExpensesResult {
  items: ExpenseWithCategoryRow[];
  nextCursor: string | null;
  totalCount: number;
  totalCents: number;
}

export function encodeExpenseCursor(cursor: ExpenseCursor): string {
  const json = JSON.stringify(cursor);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeExpenseCursor(raw: string): ExpenseCursor | null {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let idx = 0; idx < binary.length; idx++) {
      bytes[idx] = binary.charCodeAt(idx);
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ExpenseCursor>;
    if (
      typeof parsed.d === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.d) &&
      typeof parsed.c === 'string' &&
      parsed.c.length > 0 &&
      typeof parsed.i === 'string' &&
      parsed.i.length > 0
    ) {
      return { d: parsed.d, c: parsed.c, i: parsed.i };
    }
    return null;
  } catch {
    return null;
  }
}

function buildExpensesWhereClause(
  userId: string,
  filter: ListExpensesFilter
): { whereSql: string; bindings: unknown[] } {
  const conditions: string[] = ['e.user_id = ?'];
  const bindings: unknown[] = [userId];

  if (filter.month && filter.month !== 'all') {
    conditions.push('e.expense_date LIKE ?');
    bindings.push(`${filter.month}-%`);
  }

  if (filter.from) {
    conditions.push('e.expense_date >= ?');
    bindings.push(filter.from);
  }

  if (filter.to) {
    conditions.push('e.expense_date <= ?');
    bindings.push(filter.to);
  }

  if (filter.categoryId) {
    conditions.push('e.category_id = ?');
    bindings.push(filter.categoryId);
  }

  if (filter.minCents !== undefined) {
    conditions.push('e.amount_cents >= ?');
    bindings.push(filter.minCents);
  }

  if (filter.maxCents !== undefined) {
    conditions.push('e.amount_cents <= ?');
    bindings.push(filter.maxCents);
  }

  if (filter.search && filter.search.trim()) {
    const pattern = `%${filter.search.trim()}%`;
    conditions.push(
      '(COALESCE(e.merchant, \'\') LIKE ? OR COALESCE(e.notes, \'\') LIKE ? OR COALESCE(c.name, \'\') LIKE ?)'
    );
    bindings.push(pattern, pattern, pattern);
  }

  return { whereSql: conditions.join(' AND '), bindings };
}

export async function listExpensesPaginated(
  db: D1Database,
  userId: string,
  filter: ListExpensesFilter = {}
): Promise<PaginatedExpensesResult> {
  const { whereSql, bindings } = buildExpensesWhereClause(userId, filter);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));

  // Total agregado em SQL para os filtros ativos
  const totalsRow = await db
    .prepare(
      `SELECT COUNT(*) AS total_count, COALESCE(SUM(e.amount_cents), 0) AS total_cents
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
       WHERE ${whereSql}`
    )
    .bind(...bindings)
    .first<{ total_count: number; total_cents: number }>();

  const pageConditions = [whereSql];
  const pageBindings = [...bindings];

  if (filter.cursor) {
    pageConditions.push(
      `(e.expense_date < ? OR (e.expense_date = ? AND (e.created_at < ? OR (e.created_at = ? AND e.id < ?))))`
    );
    pageBindings.push(
      filter.cursor.d,
      filter.cursor.d,
      filter.cursor.c,
      filter.cursor.c,
      filter.cursor.i
    );
  }

  const sql = `
    SELECT e.id, e.user_id, e.amount_cents, e.expense_date, e.merchant, e.category_id, e.notes,
           e.source, e.image_key, e.thumbnail, e.ai_confidence, e.ai_raw, e.content_hash,
           e.created_at, e.updated_at,
           c.name AS category_name, c.icon AS category_icon, c.color AS category_color
    FROM expenses e
    LEFT JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
    WHERE ${pageConditions.join(' AND ')}
    ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC
    LIMIT ?
  `;

  const { results } = await db
    .prepare(sql)
    .bind(...pageBindings, limit + 1)
    .all<ExpenseWithCategoryRow>();

  const hasMore = results.length > limit;
  const items = hasMore ? results.slice(0, limit) : results;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeExpenseCursor({
          d: last.expense_date,
          c: last.created_at,
          i: last.id,
        })
      : null;

  return {
    items,
    nextCursor,
    totalCount: Number(totalsRow?.total_count ?? 0),
    totalCents: Number(totalsRow?.total_cents ?? 0),
  };
}

export async function listExpenses(
  db: D1Database,
  userId: string,
  filter: ListExpensesFilter = {}
): Promise<ExpenseWithCategoryRow[]> {
  const res = await listExpensesPaginated(db, userId, {
    ...filter,
    limit: filter.limit ?? 100,
  });
  return res.items;
}

export async function listExpensesForExport(
  db: D1Database,
  userId: string,
  filter: ListExpensesFilter = {}
): Promise<ExpenseWithCategoryRow[]> {
  const { whereSql, bindings } = buildExpensesWhereClause(userId, filter);
  const { results } = await db
    .prepare(
      `SELECT e.id, e.user_id, e.amount_cents, e.expense_date, e.merchant, e.category_id, e.notes,
              e.source, e.image_key, e.thumbnail, e.ai_confidence, e.ai_raw, e.content_hash,
              e.created_at, e.updated_at,
              c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
       WHERE ${whereSql}
       ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC
       LIMIT 5000`
    )
    .bind(...bindings)
    .all<ExpenseWithCategoryRow>();

  return results;
}

export async function getExpenseById(
  db: D1Database,
  userId: string,
  expenseId: string
): Promise<ExpenseWithCategoryRow | null> {
  const row = await db
    .prepare(
      `SELECT e.id, e.user_id, e.amount_cents, e.expense_date, e.merchant, e.category_id, e.notes,
              e.source, e.image_key, e.thumbnail, e.ai_confidence, e.ai_raw, e.content_hash,
              e.created_at, e.updated_at,
              c.name AS category_name, c.icon AS category_icon, c.color AS category_color
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
       WHERE e.id = ? AND e.user_id = ?`
    )
    .bind(expenseId, userId)
    .first<ExpenseWithCategoryRow>();

  return row ?? null;
}

export async function findExpenseByContentHash(
  db: D1Database,
  userId: string,
  contentHash: string
): Promise<ExpenseRow | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, amount_cents, expense_date, merchant, category_id, notes,
              source, image_key, thumbnail, ai_confidence, ai_raw, content_hash,
              created_at, updated_at
       FROM expenses
       WHERE user_id = ? AND content_hash = ?
       LIMIT 1`
    )
    .bind(userId, contentHash)
    .first<ExpenseRow>();

  return row ?? null;
}

export interface CreateExpenseInput {
  id?: string;
  amountCents: number;
  expenseDate: string;
  merchant?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  source: ExpenseSource;
  imageKey?: string | null;
  thumbnail?: string | null;
  aiConfidence?: number | null;
  aiRaw?: string | null;
  contentHash?: string | null;
}

export async function insertExpense(
  db: D1Database,
  userId: string,
  input: CreateExpenseInput
): Promise<ExpenseWithCategoryRow> {
  const id = input.id ?? crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO expenses (
        id, user_id, amount_cents, expense_date, merchant, category_id, notes,
        source, image_key, thumbnail, ai_confidence, ai_raw, content_hash,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(
      id,
      userId,
      input.amountCents,
      input.expenseDate,
      input.merchant ?? null,
      input.categoryId ?? null,
      input.notes ?? null,
      input.source,
      input.imageKey ?? null,
      input.thumbnail ?? null,
      input.aiConfidence ?? null,
      input.aiRaw ?? null,
      input.contentHash ?? null
    )
    .run();

  const created = await getExpenseById(db, userId, id);
  if (!created) {
    throw new Error('Falha ao recuperar lançamento recém-criado.');
  }
  return created;
}

export interface UpdateExpenseInput {
  amountCents?: number;
  expenseDate?: string;
  merchant?: string | null;
  categoryId?: string | null;
  notes?: string | null;
}

export async function updateExpense(
  db: D1Database,
  userId: string,
  expenseId: string,
  patch: UpdateExpenseInput
): Promise<ExpenseWithCategoryRow | null> {
  const existing = await getExpenseById(db, userId, expenseId);
  if (!existing) return null;

  await db
    .prepare(
      `UPDATE expenses
       SET amount_cents = ?,
           expense_date = ?,
           merchant = ?,
           category_id = ?,
           notes = ?,
           updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      patch.amountCents ?? existing.amount_cents,
      patch.expenseDate ?? existing.expense_date,
      patch.merchant !== undefined ? patch.merchant : existing.merchant,
      patch.categoryId !== undefined ? patch.categoryId : existing.category_id,
      patch.notes !== undefined ? patch.notes : existing.notes,
      expenseId,
      userId
    )
    .run();

  return getExpenseById(db, userId, expenseId);
}

export async function deleteExpense(
  db: D1Database,
  userId: string,
  expenseId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM expenses WHERE id = ? AND user_id = ?`)
    .bind(expenseId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
