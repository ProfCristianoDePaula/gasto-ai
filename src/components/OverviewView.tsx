import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  PiggyBank,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ApiExpense,
  DashboardResponse,
  ThemeMode,
} from '../types/finance';
import { formatCents, formatDateBr, formatMonthLabel } from '../utils/finance';
import { CashflowChart } from './CashflowChart';
import { DynamicCategoryIcon } from './CategoryIcon';
import { CurrencyText } from './CurrencyText';
import { DashboardSkeleton, EmptyState, ErrorState } from './States';

interface OverviewViewProps {
  dashboard?: DashboardResponse;
  monthKey: string;
  theme: ThemeMode;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onNavigateToTransactions: (categoryId?: string) => void;
  onNavigateToBudgets: () => void;
  onEditExpense: (expense: ApiExpense) => void;
  onOpenNewModal: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: 'Manual',
  image: 'Foto',
  text: 'Texto',
  voice: 'Voz',
};

export function OverviewView({
  dashboard,
  monthKey,
  theme,
  isLoading,
  errorMessage,
  onRetry,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onEditExpense,
  onOpenNewModal,
}: OverviewViewProps) {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (!dashboard) {
    return <DashboardSkeleton />;
  }

  const {
    totalCents,
    expenseCount,
    previousMonth,
    previousMonthTotalCents,
    variationPct,
    totalExpensesAllTime,
    dailySeries,
    categories,
    recentExpenses,
    budgetStatus,
  } = dashboard;

  const avgCents = expenseCount > 0 ? Math.round(totalCents / expenseCount) : 0;
  const topCategory =
    categories.find((c) => c.spentCents > 0) ?? categories[0] ?? null;

  const overBudgetCat = categories.find((c) => c.status === 'over');
  const warningBudgetCat = categories.find((c) => c.status === 'warning');

  const insight =
    budgetStatus.status === 'over'
      ? {
          tone: 'alert' as const,
          title: 'Orçamento mensal ultrapassado',
          message: `Você excedeu o teto de ${formatMonthLabel(monthKey)} em ${formatCents(Math.abs(budgetStatus.remainingCents))}.`,
        }
      : overBudgetCat
        ? {
            tone: 'alert' as const,
            title: `${overBudgetCat.name} acima do orçamento`,
            message: `Você ultrapassou o teto de ${overBudgetCat.name} em ${formatCents(Math.abs(overBudgetCat.remainingCents))}.`,
          }
        : warningBudgetCat
          ? {
              tone: 'warning' as const,
              title: `Atenção ao limite de ${warningBudgetCat.name}`,
              message: `${warningBudgetCat.name} atingiu ${warningBudgetCat.budgetUsagePct.toFixed(0)}% do orçamento (${formatCents(warningBudgetCat.remainingCents)} disponíveis).`,
            }
          : budgetStatus.status === 'normal' && totalCents > 0
            ? {
                tone: 'positive' as const,
                title: 'Orçamento sob controle',
                message: `Você utilizou ${budgetStatus.usagePct.toFixed(0)}% do teto mensal (${formatCents(budgetStatus.remainingCents)} disponíveis).`,
              }
            : null;

  return (
    <div className="space-y-6">
      {insight && (
        <div
          className="rounded-2xl p-[1px] bg-gradient-to-r from-[#6d5ef5]/65 via-[#06b6d4]/55 to-[#6d5ef5]/40"
          aria-label="Resumo de orçamento"
        >
          <div className="rounded-[15px] bg-[#ffffff] dark:bg-[#131b2e] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-[#6d5ef5]/12 dark:bg-[#6d5ef5]/20 text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center shrink-0">
                {insight.tone === 'alert' ? (
                  <AlertTriangle size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                  {insight.title}
                </p>
                <p className="text-xs text-[#474555] dark:text-[#c8c4d7] mt-0.5">
                  {insight.message}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="self-start sm:self-center text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              Ver orçamentos
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 4 KPIs do mês calculados em SQL agregado */}
      <section
        aria-label="Resumo financeiro do período"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Total do mês
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#6d5ef5]/12 text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center">
              <ArrowDownRight size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#131b2e] dark:text-[#dae2fd]">
            <CurrencyText amountCents={totalCents} />
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2 flex items-center gap-1.5">
            {variationPct === null ? (
              <span>Sem despesas em {formatMonthLabel(previousMonth).toLowerCase()}</span>
            ) : (
              <>
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                    variationPct > 0
                      ? 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                      : variationPct < 0
                        ? 'text-[#16A34A] dark:text-[#4edea3]'
                        : 'text-[#787586] dark:text-[#928ea1]'
                  }`}
                >
                  {variationPct > 0 ? (
                    <TrendingUp size={13} />
                  ) : variationPct < 0 ? (
                    <TrendingDown size={13} />
                  ) : (
                    <ArrowUpRight size={13} />
                  )}
                  {variationPct > 0 ? '+' : ''}
                  {variationPct.toFixed(1).replace('.', ',')}%
                </span>
                <span>
                  vs {formatCents(previousMonthTotalCents)} no mês anterior
                </span>
              </>
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Status do orçamento
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#10B981]/12 text-[#16A34A] dark:text-[#4edea3] inline-flex items-center justify-center">
              <PiggyBank size={16} />
            </span>
          </div>
          <p
            className={`text-2xl sm:text-[28px] font-bold tracking-tight ${
              budgetStatus.status === 'over'
                ? 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                : budgetStatus.status === 'warning'
                  ? 'text-[#D97706] dark:text-[#F59E0B]'
                  : 'text-[#131b2e] dark:text-[#dae2fd]'
            }`}
          >
            {budgetStatus.status === 'unset' ? (
              'Sem teto'
            ) : (
              <span className="tabular-nums">
                {budgetStatus.usagePct.toFixed(0)}%
              </span>
            )}
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            {budgetStatus.status === 'unset'
              ? 'Defina limites na aba Orçamentos'
              : budgetStatus.remainingCents >= 0
                ? `Restam ${formatCents(budgetStatus.remainingCents)} de ${formatCents(budgetStatus.totalLimitCents)}`
                : `Excedido em ${formatCents(Math.abs(budgetStatus.remainingCents))}`}
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Despesas no mês
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#06B6D4]/12 text-[#0051d5] dark:text-[#4cd7f6] inline-flex items-center justify-center">
              <Receipt size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[#131b2e] dark:text-[#dae2fd]">
            {expenseCount}
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            {expenseCount === 0
              ? 'Nenhum registro no mês'
              : `Média de ${formatCents(avgCents)} por despesa`}
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Maior categoria
            </span>
            {topCategory ? (
              <DynamicCategoryIcon
                icon={topCategory.icon}
                color={topCategory.color}
                size="sm"
              />
            ) : null}
          </div>
          <p className="text-xl sm:text-2xl font-bold tracking-tight text-[#131b2e] dark:text-[#dae2fd] truncate">
            {topCategory && topCategory.spentCents > 0
              ? topCategory.name
              : '—'}
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            {topCategory && topCategory.spentCents > 0
              ? `${formatCents(topCategory.spentCents)} (${topCategory.sharePct.toFixed(0)}% do total)`
              : 'Aguardando despesas no mês'}
          </p>
        </div>
      </section>

      {/* Série diária + Totais e % por categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                  Evolução Diária
                </h2>
                <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                  Distribuição diária dos gastos em {formatMonthLabel(monthKey)}
                </p>
              </div>
            </div>
            <CashflowChart data={dailySeries} theme={theme} />
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                Gastos por Categoria
              </h2>
              <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                Totais e participação no mês
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateToBudgets}
              className="text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] hover:underline whitespace-nowrap"
            >
              Orçamentos
            </button>
          </div>

          <div className="space-y-4">
            {categories.map((item) => {
              const barPct =
                item.budgetCents > 0
                  ? Math.min(100, item.budgetUsagePct)
                  : Math.min(100, item.sharePct);
              const barColor =
                item.status === 'over'
                  ? '#EF4444'
                  : item.status === 'warning'
                    ? '#F59E0B'
                    : item.color;

              return (
                <button
                  key={item.categoryId ?? 'uncategorized'}
                  type="button"
                  onClick={() =>
                    item.categoryId
                      ? onNavigateToTransactions(item.categoryId)
                      : onNavigateToTransactions()
                  }
                  className="w-full text-left group rounded-xl p-2 -mx-2 hover:bg-[#f2f3ff]/70 dark:hover:bg-[#171f33]"
                >
                  <div className="flex items-center justify-between text-sm mb-1.5 gap-2">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#131b2e] dark:text-[#dae2fd] min-w-0 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.name}</span>
                      <span className="text-[11px] font-medium text-[#787586] dark:text-[#928ea1] tabular-nums">
                        {item.sharePct.toFixed(0)}%
                      </span>
                    </span>

                    <span className="text-xs tabular-nums text-[#474555] dark:text-[#c8c4d7] shrink-0">
                      <strong className="font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                        <CurrencyText amountCents={item.spentCents} />
                      </strong>
                      {item.budgetCents > 0 && (
                        <span className="text-[#787586] dark:text-[#928ea1]">
                          {' / '}
                          <CurrencyText amountCents={item.budgetCents} />
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#eaedff] dark:bg-[#0b1326] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Últimas 10 despesas */}
      <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Últimas 10 Despesas
            </h2>
            <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
              Histórico recente em {formatMonthLabel(monthKey)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTransactions()}
            className="text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
          >
            Ver extrato completo
            <ChevronRight size={14} />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <EmptyState
            title={
              totalExpensesAllTime === 0
                ? 'Envie a foto do seu primeiro comprovante'
                : 'Nenhuma despesa registrada neste mês'
            }
            description={
              totalExpensesAllTime === 0
                ? 'Comece registrando sua primeira despesa manualmente ou preparando seus comprovantes para acompanhamento automático.'
                : 'Altere o mês no seletor acima ou adicione uma nova despesa para este período.'
            }
            action={
              <button
                type="button"
                onClick={onOpenNewModal}
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3]"
              >
                Nova despesa
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[#E2E8F0]/70 dark:divide-white/6">
            {recentExpenses.map((expense) => (
              <li key={expense.id}>
                <button
                  type="button"
                  onClick={() => onEditExpense(expense)}
                  className="w-full min-h-[64px] py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-4 text-left hover:bg-[#f2f3ff]/65 dark:hover:bg-[#171f33]"
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
                        <span>{expense.category_name ?? 'Sem categoria'}</span>
                        <span aria-hidden="true"> · </span>
                        <span>
                          {SOURCE_LABEL[expense.source] ?? expense.source}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span className="text-sm sm:text-base font-semibold shrink-0 text-[#131b2e] dark:text-[#dae2fd]">
                    <CurrencyText amountCents={expense.amount_cents} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
