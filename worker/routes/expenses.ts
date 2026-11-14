import { Hono } from 'hono';
import {
  deleteExpense,
  ensureDefaultCategories,
  getCategoryById,
  getCategoryByName,
  getExpenseById,
  insertExpense,
  listExpensesForExport,
  listExpensesPaginated,
  updateExpense,
} from '../db';
import { AppError } from '../errors';
import type { HonoAppEnv } from '../types';
import { buildExpensesCsv } from '../utils/csv';
import {
  CreateExpenseSchema,
  parseExpensesFilterQuery,
  UpdateExpenseSchema,
} from '../utils/validation';

export function registerExpenseRoutes(app: Hono<HonoAppEnv>) {
  /**
   * GET /api/expenses — Lista despesas do usuário autenticado com filtros e paginação por cursor.
   */
  app.get('/api/expenses', async (c) => {
    const userId = c.get('userId');
    const parsed = parseExpensesFilterQuery(c.req.query());
    if (!parsed.ok) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.message);
    }

    const result = await listExpensesPaginated(c.env.DB, userId, parsed.filter);
    return c.json(result);
  });

  /**
   * GET /api/expenses/export.csv — Exporta despesas filtradas em CSV brasileiro (`;` + UTF-8 BOM).
   * Declarada antes de `:id` para evitar colisão de roteamento.
   */
  app.get('/api/expenses/export.csv', async (c) => {
    const userId = c.get('userId');
    const parsed = parseExpensesFilterQuery(c.req.query());
    if (!parsed.ok) {
      throw new AppError(400, 'VALIDATION_ERROR', parsed.message);
    }

    const rows = await listExpensesForExport(c.env.DB, userId, parsed.filter);
    const csv = buildExpensesCsv(rows);

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="gasto-despesas.csv"',
        'Cache-Control': 'no-store',
      },
    });
  });

  /**
   * POST /api/expenses — Cria uma nova despesa manual (ou vinda de entrada validada).
   */
  app.post('/api/expenses', async (c) => {
    const userId = c.get('userId');

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Corpo da requisição JSON inválido.');
    }

    const parsed = CreateExpenseSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados da despesa inválidos.'
      );
    }

    // Garante categorias padrão caso o usuário envie direto sem passar por /api/me
    await ensureDefaultCategories(c.env.DB, userId);

    let resolvedCategoryId: string | null = parsed.data.categoryId ?? null;
    if (resolvedCategoryId) {
      const cat = await getCategoryById(c.env.DB, userId, resolvedCategoryId);
      if (!cat) {
        throw new AppError(
          400,
          'INVALID_CATEGORY',
          'Categoria selecionada não encontrada para sua conta.'
        );
      }
    } else {
      const fallback = await getCategoryByName(c.env.DB, userId, 'Outros');
      resolvedCategoryId = fallback?.id ?? null;
    }

    const created = await insertExpense(c.env.DB, userId, {
      amountCents: parsed.data.amountCents,
      expenseDate: parsed.data.expenseDate,
      merchant: parsed.data.merchant,
      categoryId: resolvedCategoryId,
      notes: parsed.data.notes ?? null,
      source: parsed.data.source,
    });

    return c.json({ expense: created }, 201);
  });

  /**
   * PATCH /api/expenses/:id — Atualiza uma despesa pertencente ao usuário autenticado.
   */
  app.patch('/api/expenses/:id', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('id')?.trim();
    if (!expenseId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ID da despesa inválido.');
    }

    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Corpo da requisição JSON inválido.');
    }

    const parsed = UpdateExpenseSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados de atualização inválidos.'
      );
    }

    if (parsed.data.categoryId) {
      const cat = await getCategoryById(c.env.DB, userId, parsed.data.categoryId);
      if (!cat) {
        throw new AppError(
          400,
          'INVALID_CATEGORY',
          'Categoria selecionada não encontrada para sua conta.'
        );
      }
    }

    const updated = await updateExpense(c.env.DB, userId, expenseId, {
      amountCents: parsed.data.amountCents,
      expenseDate: parsed.data.expenseDate,
      merchant: parsed.data.merchant,
      categoryId: parsed.data.categoryId,
      notes: parsed.data.notes,
    });

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    return c.json({ expense: updated });
  });

  /**
   * DELETE /api/expenses/:id — Remove uma despesa e eventual comprovante no R2 do usuário.
   */
  app.delete('/api/expenses/:id', async (c) => {
    const userId = c.get('userId');
    const expenseId = c.req.param('id')?.trim();
    if (!expenseId) {
      throw new AppError(400, 'VALIDATION_ERROR', 'ID da despesa inválido.');
    }

    const existing = await getExpenseById(c.env.DB, userId, expenseId);
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Despesa não encontrada.');
    }

    if (existing.image_key && c.env.RECEIPTS) {
      try {
        await c.env.RECEIPTS.delete(existing.image_key);
      } catch (err) {
        console.warn('[Gastô] Falha ao remover objeto R2:', err);
      }
    }

    await deleteExpense(c.env.DB, userId, expenseId);
    return c.json({ ok: true, id: expenseId });
  });
}
