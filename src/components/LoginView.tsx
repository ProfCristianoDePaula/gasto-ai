import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  UserPlus,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { translateAuthError } from '../utils/authErrors';

type AuthScreenMode = 'login' | 'signup' | 'forgot' | 'recovery';

export function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, isPasswordRecovery, clearPasswordRecovery } = useAuth();

  const isRecoveryQuery = new URLSearchParams(location.search).get('recovery') === '1';
  const [mode, setMode] = useState<AuthScreenMode>(
    isPasswordRecovery || isRecoveryQuery ? 'recovery' : 'login'
  );

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('recovery');
    }
  }, [isPasswordRecovery]);

  // Se já existe sessão válida e não estamos redefinindo senha, volta para o painel
  useEffect(() => {
    if (session && !isPasswordRecovery && mode !== 'recovery') {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    }
  }, [session, isPasswordRecovery, mode, navigate, location.state]);

  const switchMode = (next: AuthScreenMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setShowPassword(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isSupabaseConfigured || !supabase) {
      setError(
        'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local.'
      );
      return;
    }

    if (mode === 'forgot') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setError('Informe um endereço de e-mail válido para recuperação.');
        return;
      }

      setLoading(true);
      try {
        const redirectTo = `${window.location.origin}/login?recovery=1`;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          { redirectTo }
        );
        if (resetError) {
          setError(translateAuthError(resetError.message));
          return;
        }
        setInfo(
          'Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Verifique sua caixa de entrada e spam.'
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'recovery') {
      if (password.length < 6) {
        setError('Senha fraca. Use pelo menos 6 caracteres combinando letras e números.');
        return;
      }
      if (password !== confirmPassword) {
        setError('As senhas digitadas não coincidem.');
        return;
      }

      setLoading(true);
      try {
        const { error: updateError } = await supabase.auth.updateUser({
          password,
        });
        if (updateError) {
          setError(translateAuthError(updateError.message));
          return;
        }
        clearPasswordRecovery();
        setPassword('');
        setConfirmPassword('');
        setInfo('Senha redefinida com sucesso! Redirecionando para o painel...');
        navigate('/', { replace: true });
      } finally {
        setLoading(false);
      }
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Informe um endereço de e-mail válido.');
      return;
    }
    if (password.length < 6) {
      setError('Senha fraca. A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        if (signInError) {
          setError(translateAuthError(signInError.message));
          return;
        }
        navigate('/', { replace: true });
      } else {
        const trimmedName = displayName.trim();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: trimmedName ? { display_name: trimmedName } : undefined,
          },
        });
        if (signUpError) {
          setError(translateAuthError(signUpError.message));
          return;
        }
        if (data.session) {
          navigate('/', { replace: true });
        } else {
          setInfo(
            'Conta criada! Sua conta aguarda confirmação — verifique seu e-mail para ativar o acesso antes de entrar.'
          );
          setPassword('');
          setMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const subtitle =
    mode === 'login'
      ? 'Entre com seu e-mail e senha'
      : mode === 'signup'
        ? 'Crie sua conta pessoal'
        : mode === 'forgot'
          ? 'Recupere o acesso à sua conta'
          : 'Defina uma nova senha de acesso';

  return (
    <div className="min-h-screen bg-[#faf8ff] dark:bg-[#0b1326] text-[#131b2e] dark:text-[#dae2fd] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-[#6d5ef5] text-white font-extrabold text-lg inline-flex items-center justify-center shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)]"
            aria-hidden="true"
          >
            G
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Gastô</h1>
            <p className="text-xs text-[#787586] dark:text-[#928ea1]">
              {subtitle}
            </p>
          </div>
        </div>

        {(mode === 'login' || mode === 'signup') && (
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f2f3ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8"
            role="group"
            aria-label="Modo de autenticação"
          >
            <button
              type="button"
              onClick={() => switchMode('login')}
              aria-pressed={mode === 'login'}
              className={`h-9 rounded-lg text-xs font-semibold ${
                mode === 'login'
                  ? 'bg-[#ffffff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] shadow-xs'
                  : 'text-[#474555] dark:text-[#928ea1]'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              aria-pressed={mode === 'signup'}
              className={`h-9 rounded-lg text-xs font-semibold ${
                mode === 'signup'
                  ? 'bg-[#ffffff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] shadow-xs'
                  : 'text-[#474555] dark:text-[#928ea1]'
              }`}
            >
              Criar conta
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="signup-name"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                Nome ou apelido{' '}
                <span className="font-normal text-[#787586] dark:text-[#928ea1]">
                  (opcional)
                </span>
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="nickname"
                maxLength={60}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como prefere ser chamado"
                className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@dominio.com"
                className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'recovery') && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7]"
                >
                  {mode === 'recovery' ? 'Nova senha' : 'Senha'}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full h-11 pl-3.5 pr-11 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#131b2e] dark:hover:text-[#dae2fd]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'recovery' && (
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                Confirmar nova senha
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
              />
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-[#ba1a1a] dark:text-[#ffb4ab] bg-[#ffdad6]/50 dark:bg-[#93000a]/30 border border-[#ba1a1a]/25 dark:border-[#ffb4ab]/25 rounded-xl px-3.5 py-2.5"
            >
              {error}
            </p>
          )}

          {info && (
            <p
              role="status"
              className="text-xs font-medium text-[#16A34A] dark:text-[#4edea3] bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl px-3.5 py-2.5"
            >
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)]"
          >
            {mode === 'login' ? (
              <Lock size={15} />
            ) : mode === 'signup' ? (
              <UserPlus size={15} />
            ) : mode === 'forgot' ? (
              <Mail size={15} />
            ) : (
              <KeyRound size={15} />
            )}
            {loading
              ? 'Processando...'
              : mode === 'login'
                ? 'Entrar'
                : mode === 'signup'
                  ? 'Criar conta'
                  : mode === 'forgot'
                    ? 'Enviar link de recuperação'
                    : 'Salvar nova senha'}
          </button>

          {(mode === 'forgot' || mode === 'recovery') && (
            <button
              type="button"
              onClick={() => {
                clearPasswordRecovery();
                switchMode('login');
              }}
              className="w-full h-10 rounded-xl text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] hover:bg-[#f2f3ff] dark:hover:bg-[#171f33] inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} />
              Voltar para o login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
