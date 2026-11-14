/**
 * Helpers de acesso ao D1 para a tabela `budgets`.
 * TODA consulta filtra explicitamente por `user_id` com prepared statements.
 */

export interface BudgetRow {
  id: string;
  user_id: string;
  category_id: string | null;
  amount_cents: number;
  created_at: string;
}

export async function listBudgets(
  db: D1Database,
  userId: string
): Promise<BudgetRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_id, category_id, amount_cents, created_at
       FROM budgets
       WHERE user_id = ?
       ORDER BY category_id IS NOT NULL, created_at ASC`
    )
    .bind(userId)
    .all<BudgetRow>();

  return results;
}

/**
 * Cria ou atualiza um orçamento (total quando `categoryId === null`, ou por categoria).
 */
export async function upsertBudget(
  db: D1Database,
  userId: string,
  categoryId: string | null,
  amountCents: number
): Promise<BudgetRow> {
  if (categoryId === null) {
    const existing = await db
      .prepare(
        `SELECT id, user_id, category_id, amount_cents, created_at
         FROM budgets
         WHERE user_id = ? AND category_id IS NULL`
      )
      .bind(userId)
      .first<BudgetRow>();

    if (existing) {
      await db
        .prepare(
          `UPDATE budgets SET amount_cents = ? WHERE id = ? AND user_id = ?`
        )
        .bind(amountCents, existing.id, userId)
        .run();

      return { ...existing, amount_cents: amountCents };
    }

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO budgets (id, user_id, category_id, amount_cents, created_at)
         VALUES (?, ?, NULL, ?, datetime('now'))`
      )
      .bind(id, userId, amountCents)
      .run();

    const created = await db
      .prepare(
        `SELECT id, user_id, category_id, amount_cents, created_at
         FROM budgets
         WHERE id = ? AND user_id = ?`
      )
      .bind(id, userId)
      .first<BudgetRow>();

    if (!created) throw new Error('Falha ao salvar orçamento total.');
    return created;
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO budgets (id, user_id, category_id, amount_cents, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, category_id)
       DO UPDATE SET amount_cents = excluded.amount_cents`
    )
    .bind(id, userId, categoryId, amountCents)
    .run();

  const saved = await db
    .prepare(
      `SELECT id, user_id, category_id, amount_cents, created_at
       FROM budgets
       WHERE user_id = ? AND category_id = ?`
    )
    .bind(userId, categoryId)
    .first<BudgetRow>();

  if (!saved) throw new Error('Falha ao salvar orçamento da categoria.');
  return saved;
}

export async function deleteBudget(
  db: D1Database,
  userId: string,
  budgetId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM budgets WHERE id = ? AND user_id = ?`)
    .bind(budgetId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

export async function deleteBudgetByCategory(
  db: D1Database,
  userId: string,
  categoryId: string | null
): Promise<boolean> {
  const result =
    categoryId === null
      ? await db
          .prepare(`DELETE FROM budgets WHERE user_id = ? AND category_id IS NULL`)
          .bind(userId)
          .run()
      : await db
          .prepare(`DELETE FROM budgets WHERE user_id = ? AND category_id = ?`)
          .bind(userId, categoryId)
          .run();

  return (result.meta?.changes ?? 0) > 0;
}
