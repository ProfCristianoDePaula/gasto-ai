import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type {
  ApiExpense,
  CreateExpensePayload,
  DbCategory,
} from '../types/finance';
import { parseBrlInputToCents } from '../utils/finance';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: CreateExpensePayload, existingId?: string) => void;
  initialExpense?: ApiExpense | null;
  categories: DbCategory[];
  defaultMonthKey: string;
  isSubmitting?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initialExpense,
  categories,
  defaultMonthKey,
  isSubmitting = false,
}: TransactionModalProps) {
  const [amountInput, setAmountInput] = useState('');
  const [merchant, setMerchant] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialExpense) {
      setAmountInput(
        (initialExpense.amount_cents / 100).toFixed(2).replace('.', ',')
      );
      setMerchant(initialExpense.merchant ?? '');
      setCategoryId(
        initialExpense.category_id ?? categories[0]?.id ?? ''
      );
      setExpenseDate(initialExpense.expense_date);
      setNotes(initialExpense.notes ?? '');
    } else {
      setAmountInput('');
      setMerchant('');
      setCategoryId(categories[0]?.id ?? '');
      const todayIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());
      const fallbackDate =
        defaultMonthKey !== 'all' && !todayIso.startsWith(defaultMonthKey)
          ? `${defaultMonthKey}-01`
          : todayIso;
      setExpenseDate(fallbackDate);
      setNotes('');
    }
  }, [isOpen, initialExpense, categories, defaultMonthKey]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedCents = parseBrlInputToCents(amountInput);
    if (parsedCents === null) {
      setError('Informe um valor válido maior que zero (ex: 45,90).');
      return;
    }

    const trimmedMerchant = merchant.trim();
    if (trimmedMerchant.length < 1) {
      setError('Informe o estabelecimento ou descrição da despesa.');
      return;
    }

    if (!expenseDate) {
      setError('Selecione a data da despesa.');
      return;
    }

    onSave(
      {
        amountCents: parsedCents,
        merchant: trimmedMerchant,
        categoryId: categoryId || null,
        expenseDate,
        notes: notes.trim() || null,
        source: 'manual',
      },
      initialExpense?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/12 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-white/8">
          <h2
            id="tx-modal-title"
            className="text-lg font-bold text-[#131b2e] dark:text-[#dae2fd]"
          >
            {initialExpense ? 'Editar Despesa' : 'Nova Despesa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de despesa"
            className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#474555] dark:text-[#c8c4d7] hover:bg-[#f2f3ff] dark:hover:bg-[#222a3d] focus-visible:outline-2 focus-visible:outline-[#6d5ef5]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          <div className="rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8 px-4 py-5 text-center">
            <label
              htmlFor="tx-amount"
              className="block text-xs font-semibold text-[#474555] dark:text-[#928ea1] mb-2"
            >
              Valor da despesa
            </label>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-xl font-semibold text-[#787586] dark:text-[#928ea1] opacity-70">
                R$
              </span>
              <input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amountInput}
                onChange={(e) => {
                  setAmountInput(e.target.value);
                  if (error) setError(null);
                }}
                className="w-48 bg-transparent text-center text-3xl sm:text-4xl font-bold tabular-nums tracking-tight text-[#131b2e] dark:text-[#dae2fd] placeholder:text-[#94A3B8]/50 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="tx-merchant"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              Estabelecimento ou descrição
            </label>
            <input
              id="tx-merchant"
              type="text"
              maxLength={160}
              placeholder="Ex: Supermercado, Uber, Farmácia..."
              value={merchant}
              onChange={(e) => {
                setMerchant(e.target.value);
                if (error) setError(null);
              }}
              className="w-full h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
            />
          </div>

          <div>
            <span className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-2">
              Categoria
            </span>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    aria-pressed={active}
                    className={`h-9 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 border whitespace-nowrap ${
                      active
                        ? 'text-[#131b2e] dark:text-[#dae2fd]'
                        : 'bg-[#ffffff] dark:bg-[#0b1326] border-[#E2E8F0] dark:border-white/10 text-[#474555] dark:text-[#c8c4d7] hover:border-[#6d5ef5]/50'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${cat.color}1A`,
                            borderColor: cat.color,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="tx-date"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                Data
              </label>
              <input
                id="tx-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
              />
            </div>

            <div>
              <label
                htmlFor="tx-notes"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                Observações (opcional)
              </label>
              <input
                id="tx-notes"
                type="text"
                maxLength={500}
                placeholder="Ex: Almoço com equipe"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="text-xs font-medium text-[#ba1a1a] dark:text-[#ffb4ab] bg-[#ffdad6]/50 dark:bg-[#93000a]/30 border border-[#ba1a1a]/25 dark:border-[#ffb4ab]/25 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl text-sm font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#222a3d] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-[#6d5ef5] hover:bg-[#5b4de3] disabled:opacity-60 shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)] whitespace-nowrap"
            >
              {initialExpense ? 'Salvar alterações' : 'Salvar despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
