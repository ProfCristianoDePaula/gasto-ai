import { Hono } from 'hono';
import {
  createCategory,
  deleteCustomCategory,
  ensureDefaultCategories,
  getCategoryById,
  getCategoryByName,
  updateCategory,
} from '../db';
import { AppError } from '../errors';
import type { HonoAppEnv } from '../types';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from '../utils/validation';

export function registerCategoryRoutes(app: Hono<HonoAppEnv>) {
  /**
   * GET /api/categories — Lista categorias do usuário (garantindo as 5 padrão).
   */
  app.get('/api/categories', async (c) => {
    const userId = c.get('userId');
    const categories = await ensureDefaultCategories(c.env.DB, userId);
    return c.json({ categories });
  });

  /**
   * POST /api/categories — Cria uma nova categoria personalizada para o usuário.
   */
  app.post('/api/categories', async (c) => {
    const userId = c.get('userId');

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Corpo da requisição JSON inválido.');
    }

    const parsed = CreateCategorySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados da categoria inválidos.'
      );
    }

    await ensureDefaultCategories(c.env.DB, userId);

    const existing = await getCategoryByName(
      c.env.DB,
      userId,
      parsed.data.name
    );
    if (existing) {
      throw new AppError(
        409,
        'CATEGORY_EXISTS',
        'Já existe uma categoria com esse nome.'
      );
    }

    const created = await createCategory(c.env.DB, userId, parsed.data);
    return c.json({ category: created }, 201);
  });

  /**
   * PATCH /api/categories/:id — Renomeia ou altera ícone/cor de uma categoria do usuário.
   */
  app.patch('/api/categories/:id', async (c) => {
    const userId = c.get('userId');
    const categoryId = c.req.param('id')?.trim();
    if (!categoryId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ID da categoria inválido.');
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Corpo da requisição JSON inválido.');
    }

    const parsed = UpdateCategorySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados da categoria inválidos.'
      );
    }

    const current = await getCategoryById(c.env.DB, userId, categoryId);
    if (!current) {
      throw new AppError(404, 'NOT_FOUND', 'Categoria não encontrada.');
    }

    if (parsed.data.name) {
      const conflict = await getCategoryByName(
        c.env.DB,
        userId,
        parsed.data.name
      );
      if (conflict && conflict.id !== categoryId) {
        throw new AppError(
          409,
          'CATEGORY_EXISTS',
          'Já existe outra categoria com esse nome.'
        );
      }
    }

    const updated = await updateCategory(
      c.env.DB,
      userId,
      categoryId,
      parsed.data
    );
    return c.json({ category: updated });
  });

  /**
   * DELETE /api/categories/:id — Remove categoria personalizada do usuário.
   */
  app.delete('/api/categories/:id', async (c) => {
    const userId = c.get('userId');
    const categoryId = c.req.param('id')?.trim();
    if (!categoryId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ID da categoria inválido.');
    }

    const outcome = await deleteCustomCategory(c.env.DB, userId, categoryId);
    if (outcome.status === 'not_found') {
      throw new AppError(404, 'NOT_FOUND', 'Categoria não encontrada.');
    }
    if (outcome.status === 'protected') {
      throw new AppError(
        400,
        'DEFAULT_CATEGORY_PROTECTED',
        'Categorias padrão não podem ser excluídas.'
      );
    }

    return c.json({ ok: true, id: categoryId });
  });
}
