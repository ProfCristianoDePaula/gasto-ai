/**
 * Tipagens de bindings, variáveis de contexto e payloads do Cloudflare Worker.
 */

export interface Env {
  /** Banco relacional Cloudflare D1 */
  DB: D1Database;
  /** Bucket privado Cloudflare R2 para comprovantes (opcional se IMAGE_STORAGE = "thumbnail") */
  RECEIPTS?: R2Bucket;
  /** Binding do Cloudflare Workers AI */
  AI?: Ai;
  /** Binding automático dos static assets do Vite (/dist) */
  ASSETS?: Fetcher;
  /** URL pública do projeto Supabase (ex: https://xyz.supabase.co) */
  SUPABASE_URL: string;
  /** Segredo opcional para projetos Supabase legados que assinam JWT com HS256 */
  SUPABASE_JWT_SECRET?: string;
  /** Fuso horário operacional da aplicação */
  APP_TIMEZONE?: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface HonoAppEnv {
  Bindings: Env;
  Variables: {
    userId: string;
    user: AuthUser;
  };
}

export interface ApiErrorPayload {
  error: string;
  message: string;
}
