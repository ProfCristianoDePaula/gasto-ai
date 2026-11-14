/**
 * Helpers de acesso ao D1 para a tabela `merchant_rules`.
 * TODA consulta filtra explicitamente por `user_id` com prepared statements.
 */

export interface MerchantRuleRow {
  user_id: string;
  merchant_norm: string;
  category_id: string;
  hits: number;
}

/**
 * Normaliza o nome de um estabelecimento (minúsculas, sem acentos e espaços extras)
 * para correspondência determinística de regras antes de chamar a IA.
 */
export function normalizeMerchantName(merchant: string): string {
  return merchant
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function findMerchantRule(
  db: D1Database,
  userId: string,
  merchantNorm: string
): Promise<MerchantRuleRow | null> {
  if (!merchantNorm) return null;

  const row = await db
    .prepare(
      `SELECT user_id, merchant_norm, category_id, hits
       FROM merchant_rules
       WHERE user_id = ? AND merchant_norm = ?`
    )
    .bind(userId, merchantNorm)
    .first<MerchantRuleRow>();

  return row ?? null;
}

export async function upsertMerchantRule(
  db: D1Database,
  userId: string,
  merchantNorm: string,
  categoryId: string
): Promise<void> {
  if (!merchantNorm) return;

  await db
    .prepare(
      `INSERT INTO merchant_rules (user_id, merchant_norm, category_id, hits)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, merchant_norm)
       DO UPDATE SET
         category_id = excluded.category_id,
         hits = merchant_rules.hits + 1`
    )
    .bind(userId, merchantNorm, categoryId)
    .run();
}
