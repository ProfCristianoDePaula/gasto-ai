import { FormEvent, useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router';
import { isSupabaseConfigured } from '../lib/supabase';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setNotice('Informe seu e-mail e senha para continuar.');
      return;
    }
    setNotice(
      isSupabaseConfigured
        ? 'A autenticação via Supabase Auth será ativada na Etapa 2.'
        : 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local para ativar o login na Etapa 2.'
    );
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] dark:bg-[#0b1326] text-[#131b2e] dark:text-[#dae2fd] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-xl bg-[#6d5ef5] text-white font-extrabold text-lg inline-flex items-center justify-center"
              aria-hidden="true"
            >
              G
            </span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Gastô</h1>
              <p className="text-xs text-[#787586] dark:text-[#928ea1]">
                Acesse sua conta financeira
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} />
            Voltar
          </Link>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>

          {notice && (
            <p
              role="status"
              className="text-xs font-medium text-[#5442db] dark:text-[#c5c0ff] bg-[#eaedff]/60 dark:bg-[#222a3d] rounded-xl px-3.5 py-2.5"
            >
              {notice}
            </p>
          )}

          <button
            type="submit"
            className="w-full h-11 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Lock size={15} />
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
