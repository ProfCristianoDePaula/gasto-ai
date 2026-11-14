import { Pencil, Search, Trash2, X } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_LIST,
  CategoryId,
  ThemeMode,
  Transaction,
  TransactionFilters,
} from '../types/finance';
import {
  computeSummary,
  filterTransactions,
  formatDateBr,
} from '../utils/finance';
import { CategoryIcon, getCategoryColor } from './CategoryIcon';
import { CurrencyText } from './CurrencyText';
import { EmptyState, ErrorState, ListSkeleton } from './States';

interface TransactionsViewProps {
  transactions: Transaction[];
  filters: TransactionFilters;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onFiltersChange: (next: TransactionFilters) => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onOpenNewModal: () => void;
  theme: ThemeMode;
}

export function TransactionsView({
  transactions,
  filters,
  isLoading,
  errorMessage,
  onRetry,
  onFiltersChange,
  onEditTransaction,
  onDeleteTransaction,
  onOpenNewModal,
  theme,
}: TransactionsViewProps) {
  if (isLoading) {
    return <ListSkeleton rows={5} />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  const filtered = filterTransactions(transactions, filters);
  const summary = computeSummary(filtered, 'all');

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.category !== 'all' ||
    filters.type !== 'all';

  const handleClearFilters = () => {
    onFiltersChange({
      ...filters,
      search: '',
      category: 'all',
      type: 'all',
    });
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Filtros de lançamentos"
        className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none space-y-4"
      >
        <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787586] dark:text-[#928ea1] pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="tx-search" className="sr-only">
              Buscar lançamentos
            </label>
            <input
              id="tx-search"
              type="text"
              value={filters.search}
              onChange={(e) =>
                onFiltersChange({ ...filters, search: e.target.value })
              }
              placeholder="Buscar por descrição, conta ou categoria..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, search: '' })}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg inline-flex items-center justify-center text-[#787586] hover:text-[#131b2e] dark:hover:text-[#dae2fd]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            className="inline-flex p-1 rounded-xl bg-[#f2f3ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8 self-start"
            role="group"
            aria-label="Filtrar por tipo"
          >
            {(
              [
                { id: 'all', label: 'Todos' },
                { id: 'expense', label: 'Despesas' },
                { id: 'income', label: 'Receitas' },
              ] as const
            ).map((opt) => {
              const active = filters.type === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, type: opt.id })}
                  aria-pressed={active}
                  className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#ffffff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] shadow-xs'
                      : 'text-[#474555] dark:text-[#928ea1] hover:text-[#131b2e] dark:hover:text-[#dae2fd]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, category: 'all' })}
            aria-pressed={filters.category === 'all'}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              filters.category === 'all'
                ? 'bg-[#6d5ef5] border-[#6d5ef5] text-white'
                : 'bg-[#ffffff] dark:bg-[#0b1326] border-[#E2E8F0] dark:border-white/10 text-[#474555] dark:text-[#c8c4d7] hover:border-[#6d5ef5]/50'
            }`}
          >
            Todas
          </button>

          {CATEGORY_LIST.map((cat) => {
            const active = filters.category === cat.id;
            const color = getCategoryColor(cat.id, theme);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    category: active ? 'all' : (cat.id as CategoryId),
                  })
                }
                aria-pressed={active}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold border inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
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
      </section>

      <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 sm:p-6 shadow-xs dark:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#E2E8F0] dark:border-white/8">
          <p className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
            <span className="tabular-nums text-[#131b2e] dark:text-[#dae2fd]">
              {filtered.length}
            </span>{' '}
            {filtered.length === 1
              ? 'lançamento encontrado'
              : 'lançamentos encontrados'}
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
            <span className="text-[#474555] dark:text-[#928ea1]">
              Saldo filtrado:{' '}
              <strong
                className={
                  summary.balanceCents >= 0
                    ? 'text-[#16A34A] dark:text-[#4edea3]'
                    : 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                }
              >
                <CurrencyText amountCents={summary.balanceCents} signed />
              </strong>
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento encontrado"
            description={
              hasActiveFilters
                ? 'Tente ajustar os filtros ou a busca para visualizar outros registros.'
                : 'Ainda não há lançamentos registrados para este período.'
            }
            action={
              <div className="flex items-center justify-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="h-10 px-4 rounded-xl text-sm font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449]"
                  >
                    Limpar filtros
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenNewModal}
                  className="h-10 px-4 rounded-xl text-sm font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3]"
                >
                  Novo Lançamento
                </button>
              </div>
            }
          />
        ) : (
          <ul className="divide-y divide-[#E2E8F0]/70 dark:divide-white/6">
            {filtered.map((tx) => {
              const catLabel = CATEGORIES[tx.category].label;
              const isIncome = tx.type === 'income';

              return (
                <li
                  key={tx.id}
                  className="min-h-[68px] py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-3 hover:bg-[#f2f3ff]/55 dark:hover:bg-[#171f33] transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <CategoryIcon category={tx.category} theme={theme} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#131b2e] dark:text-[#dae2fd] truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-[#787586] dark:text-[#928ea1] truncate mt-0.5">
                        <span>{formatDateBr(tx.date)}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{tx.paymentMethod}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{catLabel}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span
                      className={`text-sm sm:text-base font-semibold mr-1 ${
                        isIncome
                          ? 'text-[#16A34A] dark:text-[#4edea3]'
                          : 'text-[#131b2e] dark:text-[#dae2fd]'
                      }`}
                    >
                      <CurrencyText
                        amountCents={tx.amountCents}
                        type={isIncome ? 'income' : 'expense'}
                      />
                    </span>

                    <button
                      type="button"
                      onClick={() => onEditTransaction(tx)}
                      aria-label={`Editar ${tx.description}`}
                      className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#5442db] dark:hover:text-[#c5c0ff] hover:bg-[#eaedff] dark:hover:bg-[#222a3d]"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteTransaction(tx.id)}
                      aria-label={`Excluir ${tx.description}`}
                      className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab] hover:bg-[#ffdad6]/40 dark:hover:bg-[#93000a]/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
