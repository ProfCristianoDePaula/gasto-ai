import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, LogOut, Trash2, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiClientError } from '../lib/api';

const CONFIRMATION_PHRASE = 'EXCLUIR MEUS DADOS';

export function AccountView({
  categoriesCount,
}: {
  categoriesCount: number;
}) {
  const queryClient = useQueryClient();
  const { user, displayName, updateDisplayName, signOut } = useAuth();

  const currentNickname =
    typeof user?.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : '';

  const [nickname, setNickname] = useState(currentNickname);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [confirmation, setConfirmation] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  useEffect(() => {
    setNickname(currentNickname);
  }, [currentNickname]);

  const deleteMutation = useMutation({
    mutationFn: (phrase: string) => api.deleteMyData(phrase),
    onSuccess: (res) => {
      setConfirmation('');
      setDeleteFeedback({
        type: 'ok',
        text: `Dados removidos com sucesso (${res.deleted.expenses} despesas, ${res.deleted.budgets} orçamentos, ${res.deleted.merchantRules} regras e ${res.deleted.receiptImages} comprovantes).`,
      });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : 'Não foi possível excluir seus dados agora.';
      setDeleteFeedback({ type: 'err', text: msg });
    },
  });

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setProfileSaving(true);
    try {
      const { error } = await updateDisplayName(nickname);
      if (error) {
        setProfileFeedback({ type: 'err', text: error });
      } else {
        setProfileFeedback({
          type: 'ok',
          text: 'Nome de exibição atualizado com sucesso.',
        });
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteData = (e: FormEvent) => {
    e.preventDefault();
    setDeleteFeedback(null);
    if (confirmation.trim() !== CONFIRMATION_PHRASE) {
      setDeleteFeedback({
        type: 'err',
        text: `Digite exatamente "${CONFIRMATION_PHRASE}" para confirmar.`,
      });
      return;
    }
    deleteMutation.mutate(confirmation.trim());
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Perfil e apelido real (user_metadata) */}
      <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center"
              aria-hidden="true"
            >
              <User size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                Perfil da Conta
              </h2>
              <p className="text-xs text-[#787586] dark:text-[#928ea1]">
                {displayName ?? user?.email ?? 'Conta conectada'} ·{' '}
                {categoriesCount} categorias ativas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="h-9 px-3 rounded-xl text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab] inline-flex items-center gap-1.5"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="account-email"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              E-mail autenticado
            </label>
            <input
              id="account-email"
              type="email"
              readOnly
              value={user?.email ?? ''}
              className="w-full h-11 px-3.5 rounded-xl bg-[#f2f3ff] dark:bg-[#0b1326]/70 border border-[#E2E8F0] dark:border-white/8 text-sm text-[#787586] dark:text-[#928ea1] cursor-not-allowed"
            />
          </div>

          <div>
            <label
              htmlFor="account-nickname"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              Nome ou apelido (opcional)
            </label>
            <input
              id="account-nickname"
              type="text"
              maxLength={60}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex.: seu primeiro nome ou apelido"
              className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>

          {profileFeedback && (
            <p
              role="status"
              className={`text-xs font-medium rounded-xl px-3.5 py-2.5 border ${
                profileFeedback.type === 'ok'
                  ? 'text-[#16A34A] dark:text-[#4edea3] bg-[#10B981]/10 border-[#10B981]/25'
                  : 'text-[#ba1a1a] dark:text-[#ffb4ab] bg-[#ffdad6]/50 dark:bg-[#93000a]/30 border-[#ba1a1a]/25'
              }`}
            >
              {profileFeedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="h-10 px-4 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Check size={14} />
            {profileSaving ? 'Salvando...' : 'Salvar nome'}
          </button>
        </form>
      </section>

      {/* Zona de perigo: DELETE /api/me/data */}
      <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#ba1a1a]/25 dark:border-[#ffb4ab]/25 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span
            className="w-10 h-10 rounded-xl bg-[#ffdad6]/60 dark:bg-[#93000a]/35 text-[#ba1a1a] dark:text-[#ffb4ab] inline-flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Excluir meus dados
            </h2>
            <p className="text-xs text-[#474555] dark:text-[#928ea1] mt-1 leading-relaxed">
              Apaga permanentemente todas as suas despesas, orçamentos, regras de
              estabelecimentos, categorias personalizadas e imagens de
              comprovantes armazenadas no R2. As 5 categorias padrão permanecem
              disponíveis para novos registros.
            </p>
          </div>
        </div>

        <form onSubmit={handleDeleteData} className="space-y-3">
          <div>
            <label
              htmlFor="delete-confirmation"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              Digite{' '}
              <span className="font-mono font-bold text-[#ba1a1a] dark:text-[#ffb4ab]">
                {CONFIRMATION_PHRASE}
              </span>{' '}
              para confirmar
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              className="w-full h-11 px-3.5 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm focus:outline-none focus:border-[#ba1a1a]"
            />
          </div>

          {deleteFeedback && (
            <p
              role={deleteFeedback.type === 'err' ? 'alert' : 'status'}
              className={`text-xs font-medium rounded-xl px-3.5 py-2.5 border ${
                deleteFeedback.type === 'ok'
                  ? 'text-[#16A34A] dark:text-[#4edea3] bg-[#10B981]/10 border-[#10B981]/25'
                  : 'text-[#ba1a1a] dark:text-[#ffb4ab] bg-[#ffdad6]/50 dark:bg-[#93000a]/30 border-[#ba1a1a]/25'
              }`}
            >
              {deleteFeedback.text}
            </p>
          )}

          <button
            type="submit"
            disabled={
              deleteMutation.isPending ||
              confirmation.trim() !== CONFIRMATION_PHRASE
            }
            className="h-10 px-4 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-2"
          >
            <Trash2 size={14} />
            {deleteMutation.isPending
              ? 'Excluindo dados...'
              : 'Apagar todos os meus dados'}
          </button>
        </form>
      </section>
    </div>
  );
}
