/**
 * Helpers de acesso ao D1 para a tabela `categories`.
 * TODA consulta filtra explicitamente por `user_id` com prepared statements.
 */

export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: number;
  created_at: string;
}

export interface DefaultCategorySpec {
  name: string;
  icon: string;
  color: string;
}

/** As 5 categorias padrão alinhadas com ícones e cores do protótipo Gastô. */
export const DEFAULT_CATEGORIES: ReadonlyArray<DefaultCategorySpec> = [
  { name: 'Alimentação', icon: 'utensils', color: '#F97316' },
  { name: 'Transporte', icon: 'car', color: '#3B82F6' },
  { name: 'Educação', icon: 'graduation-cap', color: '#8B5CF6' },
  { name: 'Lazer', icon: 'clapperboard', color: '#EC4899' },
  { name: 'Outros', icon: 'layers', color: '#64748B' },
];

/**
 * Garante de forma idempotente que o usuário possua as 5 categorias padrão.
 */
export async function ensureDefaultCategories(
  db: D1Database,
  userId: string
): Promise<CategoryRow[]> {
  const statements = DEFAULT_CATEGORIES.map((cat) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO categories (id, user_id, name, icon, color, is_default, created_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`
      )
      .bind(crypto.randomUUID(), userId, cat.name, cat.icon, cat.color)
  );

  await db.batch(statements);
  return listCategories(db, userId);
}

export async function listCategories(
  db: D1Database,
  userId: string
): Promise<CategoryRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, user_id, name, icon, color, is_default, created_at
       FROM categories
       WHERE user_id = ?
       ORDER BY is_default DESC, name ASC`
    )
    .bind(userId)
    .all<CategoryRow>();

  return results;
}

export async function getCategoryById(
  db: D1Database,
  userId: string,
  categoryId: string
): Promise<CategoryRow | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, name, icon, color, is_default, created_at
       FROM categories
       WHERE id = ? AND user_id = ?`
    )
    .bind(categoryId, userId)
    .first<CategoryRow>();

  return row ?? null;
}

export async function getCategoryByName(
  db: D1Database,
  userId: string,
  name: string
): Promise<CategoryRow | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, name, icon, color, is_default, created_at
       FROM categories
       WHERE user_id = ? AND LOWER(name) = LOWER(?)`
    )
    .bind(userId, name.trim())
    .first<CategoryRow>();

  return row ?? null;
}

export interface CreateCategoryInput {
  name: string;
  icon: string;
  color: string;
}

export async function createCategory(
  db: D1Database,
  userId: string,
  input: CreateCategoryInput
): Promise<CategoryRow> {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO categories (id, user_id, name, icon, color, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'))`
    )
    .bind(id, userId, input.name.trim(), input.icon, input.color.toUpperCase())
    .run();

  const created = await getCategoryById(db, userId, id);
  if (!created) {
    throw new Error('Falha ao recuperar categoria criada.');
  }
  return created;
}

export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
}

export async function updateCategory(
  db: D1Database,
  userId: string,
  categoryId: string,
  patch: UpdateCategoryInput
): Promise<CategoryRow | null> {
  const existing = await getCategoryById(db, userId, categoryId);
  if (!existing) return null;

  await db
    .prepare(
      `UPDATE categories
       SET name = ?, icon = ?, color = ?
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      patch.name !== undefined ? patch.name.trim() : existing.name,
      patch.icon !== undefined ? patch.icon : existing.icon,
      patch.color !== undefined ? patch.color.toUpperCase() : existing.color,
      categoryId,
      userId
    )
    .run();

  return getCategoryById(db, userId, categoryId);
}

/**
 * Remove uma categoria personalizada (`is_default = 0`) do usuário.
 * Reatribui despesas vinculadas para a categoria padrão "Outros" (ou NULL) e limpa
 * orçamentos/regras relacionados antes de excluir.
 */
export async function deleteCustomCategory(
  db: D1Database,
  userId: string,
  categoryId: string
): Promise<{ status: 'deleted' | 'not_found' | 'protected' }> {
  const existing = await getCategoryById(db, userId, categoryId);
  if (!existing) return { status: 'not_found' };
  if (existing.is_default === 1) return { status: 'protected' };

  const fallback = await getCategoryByName(db, userId, 'Outros');
  const fallbackId = fallback && fallback.id !== categoryId ? fallback.id : null;

  await db.batch([
    db
      .prepare(
        `UPDATE expenses SET category_id = ?, updated_at = datetime('now')
         WHERE user_id = ? AND category_id = ?`
      )
      .bind(fallbackId, userId, categoryId),
    db
      .prepare(`DELETE FROM budgets WHERE user_id = ? AND category_id = ?`)
      .bind(userId, categoryId),
    db
      .prepare(
        `DELETE FROM merchant_rules WHERE user_id = ? AND category_id = ?`
      )
      .bind(userId, categoryId),
    db
      .prepare(
        `DELETE FROM categories WHERE id = ? AND user_id = ? AND is_default = 0`
      )
      .bind(categoryId, userId),
  ]);

  return { status: 'deleted' };
}
