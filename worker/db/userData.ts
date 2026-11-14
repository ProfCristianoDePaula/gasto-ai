/**
 * Helpers de exclusão de dados do usuário no D1 (LGPD / limpeza de conta).
 * TODA instrução usa prepared statements filtrando estritamente por `user_id`.
 */

export interface DeletedUserDataCounts {
  expenses: number;
  budgets: number;
  merchantRules: number;
  customCategories: number;
}

/**
 * Lista todas as chaves de imagens (R2) associadas às despesas do usuário
 * antes da remoção dos registros no D1.
 */
export async function listUserExpenseImageKeys(
  db: D1Database,
  userId: string
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT image_key
       FROM expenses
       WHERE user_id = ? AND image_key IS NOT NULL AND TRIM(image_key) <> ''`
    )
    .bind(userId)
    .all<{ image_key: string }>();

  return results.map((row) => row.image_key);
}

/**
 * Remove despesas, orçamentos, regras de estabelecimento e categorias personalizadas
 * pertencentes exclusivamente ao `userId`. Mantém as categorias padrão (`is_default = 1`)
 * para que a sessão ativa continue consistente.
 */
export async function deleteAllUserData(
  db: D1Database,
  userId: string
): Promise<DeletedUserDataCounts> {
  const results = await db.batch([
    db.prepare(`DELETE FROM expenses WHERE user_id = ?`).bind(userId),
    db.prepare(`DELETE FROM budgets WHERE user_id = ?`).bind(userId),
    db.prepare(`DELETE FROM merchant_rules WHERE user_id = ?`).bind(userId),
    db
      .prepare(`DELETE FROM categories WHERE user_id = ? AND is_default = 0`)
      .bind(userId),
  ]);

  return {
    expenses: results[0]?.meta?.changes ?? 0,
    budgets: results[1]?.meta?.changes ?? 0,
    merchantRules: results[2]?.meta?.changes ?? 0,
    customCategories: results[3]?.meta?.changes ?? 0,
  };
}
