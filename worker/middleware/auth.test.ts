import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from 'jose';
import { verifySupabaseJwt } from './auth';

const SUPABASE_URL = 'https://exemplo.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;

test('verifySupabaseJwt validates asymmetric RS256 token via JWKS and extracts sub/email', async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key-1';
  jwk.alg = 'RS256';
  jwk.use = 'sig';

  const localJwks = createLocalJWKSet({ keys: [jwk] });

  const token = await new SignJWT({ email: 'usuario@teste.com', role: 'authenticated' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
    .setSubject('user-uuid-123')
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const user = await verifySupabaseJwt(token, {
    supabaseUrl: SUPABASE_URL,
    jwksOverride: localJwks,
  });

  assert.equal(user.id, 'user-uuid-123');
  assert.equal(user.email, 'usuario@teste.com');
});

test('verifySupabaseJwt validates HS256 token when SUPABASE_JWT_SECRET is provided', async () => {
  const secret = 'super-segredo-hs256-com-mais-de-32-chars';
  const key = new TextEncoder().encode(secret);

  const token = await new SignJWT({ email: 'hs@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-hs-456')
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key);

  const user = await verifySupabaseJwt(token, {
    supabaseUrl: SUPABASE_URL,
    jwtSecret: secret,
  });

  assert.equal(user.id, 'user-hs-456');
  assert.equal(user.email, 'hs@teste.com');
});

test('verifySupabaseJwt rejects expired token, wrong issuer, missing exp, wrong secret, and missing sub', async () => {
  const secret = 'super-segredo-hs256-com-mais-de-32-chars';
  const key = new TextEncoder().encode(secret);

  const expiredToken = await new SignJWT({ email: 'exp@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-exp')
    .setIssuer(ISSUER)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(key);

  await assert.rejects(() =>
    verifySupabaseJwt(expiredToken, { supabaseUrl: SUPABASE_URL, jwtSecret: secret })
  );

  const wrongIssuerToken = await new SignJWT({ email: 'iss@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-iss')
    .setIssuer('https://outro-projeto.supabase.co/auth/v1')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key);

  await assert.rejects(() =>
    verifySupabaseJwt(wrongIssuerToken, { supabaseUrl: SUPABASE_URL, jwtSecret: secret })
  );

  const missingExpToken = await new SignJWT({ email: 'noexp@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-noexp')
    .setIssuer(ISSUER)
    .setIssuedAt()
    .sign(key);

  await assert.rejects(() =>
    verifySupabaseJwt(missingExpToken, { supabaseUrl: SUPABASE_URL, jwtSecret: secret })
  );

  const noSubToken = await new SignJWT({ email: 'nosub@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key);

  await assert.rejects(() =>
    verifySupabaseJwt(noSubToken, { supabaseUrl: SUPABASE_URL, jwtSecret: secret })
  );

  const validToken = await new SignJWT({ email: 'ok@teste.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('user-ok')
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key);

  await assert.rejects(() =>
    verifySupabaseJwt(validToken, {
      supabaseUrl: SUPABASE_URL,
      jwtSecret: 'segredo-errado-diferente-do-original',
    })
  );
});
