import { createMiddleware } from 'hono/factory';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { AuthUser, HonoAppEnv } from '../types';

/** Cache em memória dos conjuntos JWKS por URL do Supabase (evita downloads repetidos). */
const jwksCache = new Map<string, JWTVerifyGetKey>();

const GENERIC_UNAUTHORIZED_BODY = {
  error: 'UNAUTHORIZED',
  message: 'Não autorizado. Faça login novamente.',
} as const;

function getJwksForSupabase(supabaseUrl: string): JWTVerifyGetKey {
  const normalized = supabaseUrl.replace(/\/+$/, '');
  let jwks = jwksCache.get(normalized);
  if (!jwks) {
    const jwksUrl = new URL(`${normalized}/auth/v1/.well-known/jwks.json`);
    jwks = createRemoteJWKSet(jwksUrl);
    jwksCache.set(normalized, jwks);
  }
  return jwks;
}

export interface JwtVerificationOptions {
  supabaseUrl: string;
  jwtSecret?: string;
  /** Permite injetar um resolvedor JWKS customizado em testes unitários */
  jwksOverride?: JWTVerifyGetKey;
}

/**
 * Valida um JWT emitido pelo Supabase Auth (JWKS assimétrico ou HS256 com SUPABASE_JWT_SECRET).
 * Confere assinatura, issuer (`${SUPABASE_URL}/auth/v1`), expiração (`exp`) e `sub`.
 */
export async function verifySupabaseJwt(
  token: string,
  options: JwtVerificationOptions
): Promise<AuthUser> {
  const header = decodeProtectedHeader(token);
  const alg = header.alg ?? '';
  if (!alg || alg.toLowerCase() === 'none') {
    throw new Error('Algoritmo JWT inválido.');
  }

  const normalizedUrl = options.supabaseUrl.replace(/\/+$/, '');
  const expectedIssuer = `${normalizedUrl}/auth/v1`;

  let payload: JWTPayload;

  if (alg === 'HS256') {
    if (!options.jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET não configurado para tokens HS256.');
    }
    const secretKey = new TextEncoder().encode(options.jwtSecret);
    const result = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      issuer: expectedIssuer,
      requiredClaims: ['sub', 'exp'],
    });
    payload = result.payload;
  } else {
    const jwks = options.jwksOverride ?? getJwksForSupabase(normalizedUrl);
    const result = await jwtVerify(token, jwks, {
      issuer: expectedIssuer,
      requiredClaims: ['sub', 'exp'],
    });
    payload = result.payload;
  }

  if (typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new Error('Token sem identificador de usuário (sub).');
  }

  const email = typeof payload.email === 'string' ? payload.email : null;
  return {
    id: payload.sub,
    email,
  };
}

/**
 * Cria o middleware Hono de autenticação JWT do Supabase.
 * Em qualquer falha (header ausente, assinatura inválida, expirado ou issuer incorreto),
 * responde com 401 genérico e não vaza detalhes internos do token.
 */
export function createRequireAuth(jwksOverride?: JWTVerifyGetKey) {
  return createMiddleware<HonoAppEnv>(async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(GENERIC_UNAUTHORIZED_BODY, 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return c.json(GENERIC_UNAUTHORIZED_BODY, 401);
    }

    const supabaseUrl = c.env?.SUPABASE_URL;
    if (!supabaseUrl) {
      return c.json(GENERIC_UNAUTHORIZED_BODY, 401);
    }

    try {
      const user = await verifySupabaseJwt(token, {
        supabaseUrl,
        jwtSecret: c.env?.SUPABASE_JWT_SECRET,
        jwksOverride,
      });
      c.set('userId', user.id);
      c.set('user', user);
    } catch {
      return c.json(GENERIC_UNAUTHORIZED_BODY, 401);
    }

    await next();
  });
}

export const requireAuth = createRequireAuth();
