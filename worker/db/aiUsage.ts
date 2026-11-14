/**
 * Helpers de acesso ao D1 para a tabela `ai_usage` (controle diário de chamadas à IA).
 * TODA consulta filtra explicitamente por `user_id` com prepared statements.
 */

export type AiUsageKind = 'image' | 'text' | 'voice';

export interface AiUsageRow {
  user_id: string;
  day: string;
  kind: AiUsageKind;
  calls: number;
}

export async function getAiUsageCount(
  db: D1Database,
  userId: string,
  day: string,
  kind: AiUsageKind
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT calls
       FROM ai_usage
       WHERE user_id = ? AND day = ? AND kind = ?`
    )
    .bind(userId, day, kind)
    .first<{ calls: number }>();

  return row?.calls ?? 0;
}

export async function incrementAiUsage(
  db: D1Database,
  userId: string,
  day: string,
  kind: AiUsageKind
): Promise<number> {
  await db
    .prepare(
      `INSERT INTO ai_usage (user_id, day, kind, calls)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (user_id, day, kind)
       DO UPDATE SET calls = ai_usage.calls + 1`
    )
    .bind(userId, day, kind)
    .run();

  return getAiUsageCount(db, userId, day, kind);
}
