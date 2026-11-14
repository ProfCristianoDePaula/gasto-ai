import { Download, Pencil, Search, Trash2, X } from 'lucide-react';
import {
  ApiExpense,
  DbCategory,
  ExpensesFilterState,
} from '../types/finance';
import { formatDateBr } from '../utils/finance';
import { DynamicCategoryIcon } from './CategoryIcon';
import { CurrencyText } from './CurrencyText';
import { EmptyState, ErrorState, ListSkeleton } from './States';

interface TransactionsViewProps {
  expenses: ApiExpense[];
  totalCount: number;
  totalCents: number;
  categories: DbCategory[];
  filters: ExpensesFilterState;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  isExporting?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onFiltersChange: (next: ExpensesFilterState) => void;
  onLoadMore: () => void;
  onExportCsv: () => void;
  onEditExpense: (expense: ApiExpense) => void;
  onDeleteExpense: (id: string) => void;
  onOpenNewModal: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual',
  image: 'Foto',
  text: 'Texto',
  voice: 'Voz',
};

export function TransactionsView({
  expenses,
  totalCount,
  totalCents,
  categories,
  filters,
  isLoading,
  isFetchingMore,
  hasMore,
  isExporting = false,
  errorMessage,
  onRetry,
  onFiltersChange,
  onLoadMore,
  onExportCsv,
  onEditExpense,
  onDeleteExpense,
  onOpenNewModal,
}: TransactionsViewProps) {
  const hasActiveFilters =
    filters.q.trim() !== '' ||
    filters.category !== 'all' ||
    filters.from !== '' ||
    filters.to !== '' ||
    filters.minReais.trim() !== '' ||
    filters.maxReais.trim() !== '';

  const handleClearFilters = () => {
    onFiltersChange({
      ...filters,
      q: '',
      category: 'all',
      from: '',
      to: '',
      minReais: '',
      maxReais: '',
    });
  };

  return (
    <div className="space-y-6">
      <section
        aria-label="Filtros de despesas"
        className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none space-y-4"
      >
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#787586] dark:text-[#928ea1] pointer-events-none"
              aria-hidden="true"
            />
            <label htmlFor="tx-search" className="sr-only">
              Buscar despesas
            </label>
            <input
              id="tx-search"
              type="text"
              value={filters.q}
              onChange={(e) =>
                onFiltersChange({ ...filters, q: e.target.value })
              }
              placeholder="Buscar por estabelecimento, observação ou categoria..."
              className="w-full h-11 pl-10 pr-9 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#6d5ef5] focus:ring-2 focus:ring-[#6d5ef5]/20"
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, q: '' })}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg inline-flex items-center justify-center text-[#787586] hover:text-[#131b2e] dark:hover:text-[#dae2fd]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onExportCsv}
              disabled={isExporting || totalCount === 0}
              className="h-11 px-4 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] disabled:opacity-50 inline-flex items-center gap-2 whitespace-nowrap"
            >
              <Download size={15} />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        </div>

        {/* Filtros de data (from/to) e faixa de valor (min/max) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="filter-from"
              className="block text-[11px] font-semibold text-[#787586] dark:text-[#928ea1] mb-1"
            >
              De
            </label>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={(e) =>
                onFiltersChange({ ...filters, from: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-xs text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>
          <div>
            <label
              htmlFor="filter-to"
              className="block text-[11px] font-semibold text-[#787586] dark:text-[#928ea1] mb-1"
            >
              Até
            </label>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              onChange={(e) =>
                onFiltersChange({ ...filters, to: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-xs text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>
          <div>
            <label
              htmlFor="filter-min"
              className="block text-[11px] font-semibold text-[#787586] dark:text-[#928ea1] mb-1"
            >
              Valor mín. (R$)
            </label>
            <input
              id="filter-min"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={filters.minReais}
              onChange={(e) =>
                onFiltersChange({ ...filters, minReais: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-xs tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>
          <div>
            <label
              htmlFor="filter-max"
              className="block text-[11px] font-semibold text-[#787586] dark:text-[#928ea1] mb-1"
            >
              Valor máx. (R$)
            </label>
            <input
              id="filter-max"
              type="text"
              inputMode="decimal"
              placeholder="9999,00"
              value={filters.maxReais}
              onChange={(e) =>
                onFiltersChange({ ...filters, maxReais: e.target.value })
              }
              className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-xs tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
            />
          </div>
        </div>

        {/* Categorias do usuário */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por categoria"
        >
          <button
            type="button"
            onClick={() => onFiltersChange({ ...filters, category: 'all' })}
            aria-pressed={filters.category === 'all'}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 ${
              filters.category === 'all'
                ? 'bg-[#6d5ef5] border-[#6d5ef5] text-white'
                : 'bg-[#ffffff] dark:bg-[#0b1326] border-[#E2E8F0] dark:border-white/10 text-[#474555] dark:text-[#c8c4d7] hover:border-[#6d5ef5]/50'
            }`}
          >
            Todas
          </button>

          {categories.map((cat) => {
            const active = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onFiltersChange({
                    ...filters,
                    category: active ? 'all' : cat.id,
                  })
                }
                aria-pressed={active}
                className={`h-9 px-3.5 rounded-full text-xs font-semibold border inline-flex items-center gap-2 whitespace-nowrap shrink-0 ${
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
      </section>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : (
        <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 sm:p-6 shadow-xs dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-2 border-b border-[#E2E8F0] dark:border-white/8">
            <p className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              <span className="tabular-nums text-[#131b2e] dark:text-[#dae2fd]">
                {totalCount}
              </span>{' '}
              {totalCount === 1
                ? 'despesa encontrada'
                : 'despesas encontradas'}
            </p>

            <div className="flex items-center gap-4 text-xs font-semibold tabular-nums">
              <span className="text-[#474555] dark:text-[#928ea1]">
                Total filtrado:{' '}
                <strong className="text-[#131b2e] dark:text-[#dae2fd]">
                  <CurrencyText amountCents={totalCents} />
                </strong>
              </span>
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              title={
                hasActiveFilters
                  ? 'Nenhuma despesa encontrada'
                  : 'Envie a foto do seu primeiro comprovante'
              }
              description={
                hasActiveFilters
                  ? 'Tente ajustar os filtros ou a busca para visualizar outros registros.'
                  : 'Ainda não há despesas registradas neste período. Adicione sua primeira despesa manualmente.'
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
                    Nova despesa
                  </button>
                </div>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-[#E2E8F0]/70 dark:divide-white/6">
                {expenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="min-h-[68px] py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-3 hover:bg-[#f2f3ff]/55 dark:hover:bg-[#171f33]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <DynamicCategoryIcon
                        icon={expense.category_icon}
                        color={expense.category_color}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#131b2e] dark:text-[#dae2fd] truncate">
                          {expense.merchant ?? 'Despesa sem estabelecimento'}
                        </p>
                        <p className="text-xs text-[#787586] dark:text-[#928ea1] truncate mt-0.5">
                          <span>{formatDateBr(expense.expense_date)}</span>
                          <span aria-hidden="true"> · </span>
                          <span>
                            {expense.category_name ?? 'Sem categoria'}
                          </span>
                          <span aria-hidden="true"> · </span>
                          <span>
                            {SOURCE_LABEL[expense.source] ?? expense.source}
                          </span>
                          {expense.notes && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{expense.notes}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-sm sm:text-base font-semibold mr-1 text-[#131b2e] dark:text-[#dae2fd]">
                        <CurrencyText amountCents={expense.amount_cents} />
                      </span>

                      <button
                        type="button"
                        onClick={() => onEditExpense(expense)}
                        aria-label={`Editar ${expense.merchant ?? 'despesa'}`}
                        className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#5442db] dark:hover:text-[#c5c0ff] hover:bg-[#eaedff] dark:hover:bg-[#222a3d]"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteExpense(expense.id)}
                        aria-label={`Excluir ${expense.merchant ?? 'despesa'}`}
                        className="w-10 h-10 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab] hover:bg-[#ffdad6]/40 dark:hover:bg-[#93000a]/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {hasMore && (
                <div className="pt-4 mt-2 border-t border-[#E2E8F0] dark:border-white/8 flex justify-center">
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isFetchingMore}
                    className="h-10 px-5 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] disabled:opacity-60"
                  >
                    {isFetchingMore ? 'Carregando...' : 'Carregar mais despesas'}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
