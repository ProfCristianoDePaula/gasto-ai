import test from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@supabase/supabase-js';
import {
  getUserDisplayName,
  getUserInitials,
  translateAuthError,
} from './authErrors';

test('translateAuthError cobre os 4 cenários principais em pt-BR', () => {
  assert.match(translateAuthError('Invalid login credentials'), /incorretos/i);
  assert.match(translateAuthError('User already registered'), /já está em uso/i);
  assert.match(
    translateAuthError('Password should be at least 6 characters'),
    /Senha fraca/i
  );
  assert.match(translateAuthError('Email not confirmed'), /aguarda confirmação/i);
});

test('getUserDisplayName prioriza user_metadata e faz fallback para email sem nome fixo', () => {
  const withNick = {
    id: '1',
    email: 'ana@exemplo.com',
    user_metadata: { display_name: 'Ana Paula' },
  } as unknown as User;
  assert.equal(getUserDisplayName(withNick), 'Ana Paula');
  assert.equal(getUserInitials('Ana Paula', 'ana@exemplo.com'), 'AP');

  const withoutNick = {
    id: '2',
    email: 'joao@exemplo.com',
    user_metadata: {},
  } as unknown as User;
  assert.equal(getUserDisplayName(withoutNick), 'joao@exemplo.com');
  assert.equal(getUserInitials('joao@exemplo.com', 'joao@exemplo.com'), 'JO');

  assert.equal(getUserDisplayName(null), null);
});
