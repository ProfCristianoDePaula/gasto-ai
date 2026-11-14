import { Hono } from 'hono';
import {
  deleteBudgetByCategory,
  ensureDefaultCategories,
  getCategoryById,
  listBudgets,
  upsertBudget,
} from '../db';
import { AppError } from '../errors';
import type { HonoAppEnv } from '../types';
import { UpsertBudgetSchema } from '../utils/validation';

export function registerBudgetRoutes(app: Hono<HonoAppEnv>) {
  /**
   * GET /api/budgets — Retorna o orçamento total (category_id NULL) e os limites por categoria.
   */
  app.get('/api/budgets', async (c) => {
    const userId = c.get('userId');
    const [categories, budgets] = await Promise.all([
      ensureDefaultCategories(c.env.DB, userId),
      listBudgets(c.env.DB, userId),
    ]);

    const totalBudget = budgets.find((b) => b.category_id === null) ?? null;
    const categoryBudgets = budgets.filter((b) => b.category_id !== null);

    return c.json({
      totalBudgetCents: totalBudget ? Number(totalBudget.amount_cents) : null,
      budgets,
      categoryBudgets,
      categories,
    });
  });

  /**
   * PUT /api/budgets — Define ou remove (`amountCents = 0`) um orçamento mensal.
   */
  app.put('/api/budgets', async (c) => {
    const userId = c.get('userId');

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Corpo da requisição JSON inválido.');
    }

    const parsed = UpsertBudgetSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados do orçamento inválidos.'
      );
    }

    const { categoryId, amountCents } = parsed.data;
    if (categoryId !== null) {
      const cat = await getCategoryById(c.env.DB, userId, categoryId);
      if (!cat) {
        throw new AppError(
          400,
          'INVALID_CATEGORY',
          'Categoria não encontrada para sua conta.'
        );
      }
    }

    if (amountCents === 0) {
      await deleteBudgetByCategory(c.env.DB, userId, categoryId);
      return c.json({ ok: true, removed: true, categoryId, amountCents: 0 });
    }

    const budget = await upsertBudget(c.env.DB, userId, categoryId, amountCents);
    return c.json({ ok: true, removed: false, budget });
  });
}
