import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  CATEGORY_LIST,
  CategoryId,
  PAYMENT_METHODS,
  PaymentMethod,
  ThemeMode,
  Transaction,
  TransactionType,
} from '../types/finance';
import { parseBrlInputToCents } from '../utils/finance';
import { getCategoryColor } from './CategoryIcon';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id'>, existingId?: string) => void;
  initialTransaction?: Transaction | null;
  theme: ThemeMode;
  defaultMonthKey: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  theme,
  defaultMonthKey,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryId>('alimentacao');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Nubank');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (initialTransaction) {
      setType(initialTransaction.type);
      setAmountInput(
        (initialTransaction.amountCents / 100).toFixed(2).replace('.', ',')
      );
      setDescription(initialTransaction.description);
      setCategory(initialTransaction.category);
      setDate(initialTransaction.date);
      setPaymentMethod(initialTransaction.paymentMethod);
    } else {
      setType('expense');
      setAmountInput('');
      setDescription('');
      setCategory('alimentacao');
      const todayIso = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
      }).format(new Date());
      const fallbackDate =
        defaultMonthKey !== 'all' && !todayIso.startsWith(defaultMonthKey)
          ? `${defaultMonthKey}-01`
          : todayIso;
      setDate(fallbackDate);
      setPaymentMethod('Nubank');
    }
  }, [isOpen, initialTransaction, defaultMonthKey]);

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
      setError('Informe um valor válido maior que zero (ex: 145,50).');
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 2) {
      setError('Informe uma descrição com pelo menos 2 caracteres.');
      return;
    }

    if (!date) {
      setError('Selecione a data do lançamento.');
      return;
    }

    onSave(
      {
        type,
        amountCents: parsedCents,
        description: trimmedDesc,
        category,
        date,
        paymentMethod,
      },
      initialTransaction?.id
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
            {initialTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de lançamento"
            className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#474555] dark:text-[#c8c4d7] hover:bg-[#f2f3ff] dark:hover:bg-[#222a3d] transition-colors focus-visible:outline-2 focus-visible:outline-[#6d5ef5]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5">
          <div
            className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#f2f3ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8"
            role="group"
            aria-label="Tipo de lançamento"
          >
            <button
              type="button"
              onClick={() => setType('expense')}
              aria-pressed={type === 'expense'}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                type === 'expense'
                  ? 'bg-[#ffffff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] shadow-sm'
                  : 'text-[#474555] dark:text-[#928ea1] hover:text-[#131b2e] dark:hover:text-[#dae2fd]'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              aria-pressed={type === 'income'}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                type === 'income'
                  ? 'bg-[#ffffff] dark:bg-[#222a3d] text-[#16A34A] dark:text-[#4edea3] shadow-sm'
                  : 'text-[#474555] dark:text-[#928ea1] hover:text-[#131b2e] dark:hover:text-[#dae2fd]'
              }`}
            >
              Receita
            </button>
          </div>

          <div className="rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8 px-4 py-5 text-center">
            <label
              htmlFor="tx-amount"
              className="block text-xs font-semibold text-[#474555] dark:text-[#928ea1] mb-2"
            >
              Valor do lançamento
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
              htmlFor="tx-description"
              className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
            >
              Descrição ou estabelecimento
            </label>
            <input
              id="tx-description"
              type="text"
              placeholder="Ex: Supermercado, Transporte, Salário..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
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
              {CATEGORY_LIST.map((cat) => {
                const active = category === cat.id;
                const color = getCategoryColor(cat.id, theme);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-pressed={active}
                    className={`h-9 px-3 rounded-full text-xs font-semibold inline-flex items-center gap-2 border transition-colors whitespace-nowrap ${
                      active
                        ? 'text-[#131b2e] dark:text-[#dae2fd]'
                        : 'bg-[#ffffff] dark:bg-[#0b1326] border-[#E2E8F0] dark:border-white/10 text-[#474555] dark:text-[#c8c4d7] hover:border-[#6d5ef5]/50'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${color}1A`,
                            borderColor: color,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    {cat.label}
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
              />
            </div>

            <div>
              <label
                htmlFor="tx-method"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5"
              >
                Conta ou meio
              </label>
              <select
                id="tx-method"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
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
              className="h-11 px-4 rounded-xl text-sm font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#222a3d] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-[#6d5ef5] hover:bg-[#5b4de3] shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)] transition-colors whitespace-nowrap"
            >
              {initialTransaction ? 'Salvar alterações' : 'Salvar lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
