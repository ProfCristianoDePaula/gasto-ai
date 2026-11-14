import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

/**
 * Constrói uma Content-Security-Policy restritiva compatível com o front React/Vite,
 * fontes do Google Fonts e autenticação/realtime do Supabase.
 */
function buildCspHeader(supabaseUrl?: string): string {
  const supabaseOrigins: string[] = [];

  if (supabaseUrl && supabaseUrl.startsWith('http')) {
    try {
      const parsed = new URL(supabaseUrl);
      supabaseOrigins.push(parsed.origin);
      supabaseOrigins.push(`wss://${parsed.host}`);
    } catch {
      // Ignora URL malformada e mantém fallback com domínio wildcard do Supabase
    }
  }

  const connectSrc = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    ...supabaseOrigins,
  ].join(' ');

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://*.supabase.co",
    "media-src 'self' blob:",
    `connect-src ${connectSrc}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/**
 * Middleware global que aplica cabeçalhos de segurança em toda resposta do Worker
 * (tanto rotas /api/* quanto páginas estáticas servidas via ASSETS).
 */
export const securityHeaders = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    await next();

    c.header('Content-Security-Policy', buildCspHeader(c.env?.SUPABASE_URL));
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Libera câmera (recibos) e microfone (voz) exclusivamente para a própria origem
    c.header('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  }
);
