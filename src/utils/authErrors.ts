import type { User } from '@supabase/supabase-js';

/**
 * Traduz mensagens técnicas do Supabase Auth para mensagens amigáveis em pt-BR.
 */
export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_credentials')
  ) {
    return 'E-mail ou senha incorretos.';
  }

  if (
    lower.includes('email not confirmed') ||
    lower.includes('not confirmed')
  ) {
    return 'Sua conta aguarda confirmação de e-mail. Verifique sua caixa de entrada ou spam.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return 'Este e-mail já está em uso. Tente entrar ou recuperar sua senha.';
  }

  if (
    lower.includes('weak password') ||
    lower.includes('weak_password') ||
    lower.includes('password should be at least') ||
    lower.includes('password is too short') ||
    lower.includes('password_too_short')
  ) {
    return 'Senha fraca. Use pelo menos 6 caracteres combinando letras e números.';
  }

  if (lower.includes('new password should be different')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }

  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Muitas tentativas em sequência. Aguarde alguns instantes e tente novamente.';
  }

  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Endereço de e-mail inválido. Confira os dados digitados.';
  }

  return 'Não foi possível concluir a autenticação. Verifique seus dados e tente novamente.';
}

/**
 * Extrai o nome/apelido real salvo em `user_metadata` ou utiliza o e-mail como fallback.
 * Nunca utiliza nome fixo ou fictício.
 */
export function getUserDisplayName(user: User | null | undefined): string | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const candidates = [meta.display_name, meta.full_name, meta.name];
  for (const val of candidates) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  if (typeof user.email === 'string' && user.email.trim().length > 0) {
    return user.email.trim();
  }
  return null;
}

export function getUserInitials(
  displayName: string | null,
  email: string | null
): string {
  const source = (displayName ?? email ?? '').trim();
  if (!source) return 'U';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}
