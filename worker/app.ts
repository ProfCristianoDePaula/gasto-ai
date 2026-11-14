import { Hono } from 'hono';
import type { JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import {
  DEFAULT_TIMEZONE,
  IMAGE_STORAGE,
  MAX_THUMBNAIL_BYTES,
} from './config';
import {
  deleteAllUserData,
  ensureDefaultCategories,
  listUserExpenseImageKeys,
} from './db';
import { AppError } from './errors';
import { createRequireAuth } from './middleware/auth';
import { securityHeaders } from './middleware/security';
import { registerBudgetRoutes } from './routes/budgets';
import { registerCategoryRoutes } from './routes/categories';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerExpenseRoutes } from './routes/expenses';
import type { ApiErrorPayload, HonoAppEnv } from './types';

export const DELETE_DATA_CONFIRMATION_TEXT = 'EXCLUIR MEUS DADOS';

const DeleteMyDataSchema = z.object({
  confirmation: z.string().trim().min(1),
});

export interface CreateAppOptions {
  jwksOverride?: JWTVerifyGetKey;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = new Hono<HonoAppEnv>();
  const authMiddleware = createRequireAuth(options.jwksOverride);

  // Aplica cabeçalhos de segurança em todas as respostas
  app.use('*', securityHeaders);

  // Tratamento global de erros: nunca expõe stack trace ao cliente
  app.onError((err, c) => {
    if (err instanceof AppError) {
      const body: ApiErrorPayload = {
        error: err.code,
        message: err.message,
      };
      return c.json(body, err.status);
    }

    console.error('[Gastô Worker Error]', err);
    const body: ApiErrorPayload = {
      error: 'INTERNAL_ERROR',
      message: 'Ocorreu um erro interno ao processar sua solicitação. Tente novamente.',
    };
    return c.json(body, 500);
  });

  /**
   * Rota pública de verificação de saúde da API e das configurações ativas do Worker.
   */
  app.get('/api/health', (c) => {
    const timezone = c.env?.APP_TIMEZONE || DEFAULT_TIMEZONE;
    return c.json({
      ok: true,
      service: 'gasto-api',
      timezone,
      imageStorage: IMAGE_STORAGE,
      maxThumbnailBytes: MAX_THUMBNAIL_BYTES,
      timestamp: new Date().toISOString(),
    });
  });

  // Todas as demais rotas /api/* exigem JWT válido do Supabase
  app.use('/api/*', async (c, next) => {
    if (c.req.path === '/api/health') {
      return next();
    }
    return authMiddleware(c, next);
  });

  /**
   * Retorna o perfil autenticado (extraído do `sub` do JWT) e garante,
   * de forma idempotente, a criação das 5 categorias padrão do usuário no D1.
   */
  app.get('/api/me', async (c) => {
    const userId = c.get('userId');
    const user = c.get('user');
    const categories = await ensureDefaultCategories(c.env.DB, userId);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
      },
      categories,
    });
  });

  /**
   * Apaga despesas, orçamentos, regras de estabelecimento, categorias personalizadas
   * e comprovantes do usuário no R2 mediante confirmação textual explícita.
   */
  app.delete('/api/me/data', async (c) => {
    let rawBody: unknown;
    try {
      rawBody = await c.req.json();
    } catch {
      throw new AppError(
        400,
        'CONFIRMATION_REQUIRED',
        `Envie um JSON válido e digite exatamente "${DELETE_DATA_CONFIRMATION_TEXT}" para confirmar.`
      );
    }

    const parsed = DeleteMyDataSchema.safeParse(rawBody);
    if (
      !parsed.success ||
      parsed.data.confirmation !== DELETE_DATA_CONFIRMATION_TEXT
    ) {
      throw new AppError(
        400,
        'CONFIRMATION_REQUIRED',
        `Confirmação inválida. Digite exatamente "${DELETE_DATA_CONFIRMATION_TEXT}" para apagar seus dados.`
      );
    }

    const userId = c.get('userId');
    let deletedReceiptImages = 0;

    // Coleta chaves R2 ligadas às despesas do usuário antes de apagar do D1
    const dbImageKeys = await listUserExpenseImageKeys(c.env.DB, userId);

    if (c.env.RECEIPTS) {
      const keysToDelete = new Set<string>(dbImageKeys);

      // Também varre objetos sob o prefixo isolado do usuário (`<userId>/`)
      let cursor: string | undefined;
      do {
        const listed = await c.env.RECEIPTS.list({
          prefix: `${userId}/`,
          cursor,
        });
        for (const obj of listed.objects) {
          keysToDelete.add(obj.key);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      const allKeys = Array.from(keysToDelete);
      for (let i = 0; i < allKeys.length; i += 1000) {
        const batch = allKeys.slice(i, i + 1000);
        await c.env.RECEIPTS.delete(batch);
        deletedReceiptImages += batch.length;
      }
    }

    const counts = await deleteAllUserData(c.env.DB, userId);

    return c.json({
      ok: true,
      deleted: {
        ...counts,
        receiptImages: deletedReceiptImages,
      },
    });
  });

  // Rotas de domínio da Etapa 4 (todas protegidas por requireAuth e validadas com Zod)
  registerExpenseRoutes(app);
  registerCategoryRoutes(app);
  registerBudgetRoutes(app);
  registerDashboardRoutes(app);

  // Garante resposta JSON padronizada para qualquer rota /api/* inexistente
  app.all('/api/*', (c) => {
    const body: ApiErrorPayload = {
      error: 'NOT_FOUND',
      message: 'Endpoint da API não encontrado.',
    };
    return c.json(body, 404);
  });

  // Em produção no Cloudflare Workers, encaminha rotas de página para os static assets (/dist)
  app.all('*', async (c) => {
    if (c.env?.ASSETS) {
      return c.env.ASSETS.fetch(c.req.raw);
    }
    return c.text(
      'Assets estáticos disponíveis apenas via build/deploy ou Vite dev server.',
      404
    );
  });

  return app;
}
