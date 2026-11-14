import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  DEFAULT_TIMEZONE,
  IMAGE_STORAGE,
  MAX_THUMBNAIL_BYTES,
} from './config';
import { securityHeaders } from './middleware/security';
import type { ApiErrorPayload, Env } from './types';

/**
 * Erro de aplicação controlado para retornar status HTTP e mensagens amigáveis em pt-BR.
 */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(
    status: ContentfulStatusCode,
    code: string,
    message: string
  ) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const app = new Hono<{ Bindings: Env }>();

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
 * Rota de verificação de saúde da API e das configurações ativas do Worker.
 * Útil para monitorar disponibilidade e validar se o Worker está respondendo em /api/*.
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
  return c.text('Assets estáticos disponíveis apenas via build/deploy ou Vite dev server.', 404);
});

export default app;
