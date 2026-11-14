import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Erro de aplicação controlado para retornar status HTTP e mensagens amigáveis em pt-BR.
 */
export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
