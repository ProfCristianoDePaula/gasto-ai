import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  CATEGORIES,
  CategoryBudget,
  CategoryId,
  ThemeMode,
  Transaction,
} from '../types/finance';
import {
  computeCashflowSeries,
  computeCategoryBreakdown,
  computeFinancialInsight,
  computeSummary,
  formatDateBr,
} from '../utils/finance';
import { CashflowChart } from './CashflowChart';
import { CategoryIcon, getCategoryColor } from './CategoryIcon';
import { CurrencyText } from './CurrencyText';
import { DashboardSkeleton, EmptyState, ErrorState } from './States';

interface OverviewViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  monthKey: string;
  theme: ThemeMode;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onNavigateToTransactions: (category?: CategoryId) => void;
  onNavigateToBudgets: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onOpenNewModal: () => void;
}

export function OverviewView({
  transactions,
  budgets,
  monthKey,
  theme,
  isLoading,
  errorMessage,
  onRetry,
  onNavigateToTransactions,
  onNavigateToBudgets,
  onEditTransaction,
  onOpenNewModal,
}: OverviewViewProps) {
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  const summary = computeSummary(transactions, monthKey);
  const breakdown = computeCategoryBreakdown(transactions, budgets, monthKey);
  const cashflow = computeCashflowSeries(transactions, monthKey);
  const insight = computeFinancialInsight(transactions, budgets, monthKey);

  const recentTransactions = transactions
    .filter((t) => monthKey === 'all' || t.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Banner de análise automática (exibido apenas quando há dados reais) */}
      {insight && (
        <div
          className="rounded-2xl p-[1px] bg-gradient-to-r from-[#6d5ef5]/65 via-[#06b6d4]/55 to-[#6d5ef5]/40"
          aria-label="Análise financeira automática"
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

      {/* 4 KPIs do período */}
      <section
        aria-label="Resumo financeiro do período"
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
      >
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Saldo do período
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#6d5ef5]/12 text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center">
              <Wallet size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#131b2e] dark:text-[#dae2fd]">
            <CurrencyText amountCents={summary.balanceCents} />
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            {summary.transactionCount === 0
              ? 'Nenhum lançamento no período'
              : `${summary.transactionCount} lançamentos registrados`}
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Receitas
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#10B981]/12 text-[#16A34A] dark:text-[#4edea3] inline-flex items-center justify-center">
              <ArrowUpRight size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#16A34A] dark:text-[#4edea3]">
            <CurrencyText amountCents={summary.incomeCents} />
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            Entradas confirmadas
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Despesas
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#6d5ef5]/12 text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center">
              <ArrowDownRight size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight text-[#131b2e] dark:text-[#dae2fd]">
            <CurrencyText amountCents={summary.expensesCents} />
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            Total gasto no período
          </p>
        </div>

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#474555] dark:text-[#928ea1]">
              Taxa de economia
            </span>
            <span className="w-8 h-8 rounded-lg bg-[#06B6D4]/12 text-[#0051d5] dark:text-[#4cd7f6] inline-flex items-center justify-center">
              <TrendingUp size={16} />
            </span>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold tracking-tight tabular-nums text-[#131b2e] dark:text-[#dae2fd]">
            {summary.savingsRate.toFixed(1).replace('.', ',')}%
          </p>
          <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-2">
            {summary.incomeCents === 0
              ? 'Aguardando receitas no período'
              : summary.savingsRate >= 20
                ? 'Acima da meta recomendada (20%)'
                : 'Meta recomendada: 20% da renda'}
          </p>
        </div>
      </section>

      {/* Fluxo de Caixa + Gastos por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-7 rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                  Fluxo de Caixa
                </h2>
                <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                  Comparativo entre entradas e saídas no período
                </p>
              </div>
            </div>
            <CashflowChart data={cashflow} theme={theme} />
          </div>
        </section>

        <section className="lg:col-span-5 rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none">
          <div className="flex items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                Gastos por Categoria
              </h2>
              <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                Consumo frente ao teto mensal
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
            {breakdown.map((item) => {
              const color = getCategoryColor(item.meta.id, theme);
              const clampedPct = Math.min(100, item.budgetUsagePct);
              const barColor =
                item.status === 'over'
                  ? '#EF4444'
                  : item.status === 'warning'
                    ? '#F59E0B'
                    : color;

              return (
                <button
                  key={item.meta.id}
                  type="button"
                  onClick={() => onNavigateToTransactions(item.meta.id)}
                  className="w-full text-left group rounded-xl p-2 -mx-2 hover:bg-[#f2f3ff]/70 dark:hover:bg-[#171f33] transition-colors"
                >
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="inline-flex items-center gap-2 font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      {item.meta.label}
                    </span>

                    <span className="text-xs tabular-nums text-[#474555] dark:text-[#c8c4d7]">
                      <strong className="font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                        <CurrencyText amountCents={item.spentCents} />
                      </strong>
                      {item.limitCents > 0 && (
                        <span className="text-[#787586] dark:text-[#928ea1]">
                          {' / '}
                          <CurrencyText amountCents={item.limitCents} />
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-[#eaedff] dark:bg-[#0b1326] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${clampedPct}%`,
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

      {/* Últimos Lançamentos */}
      <section className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Últimos Lançamentos
            </h2>
            <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
              Histórico recente do período selecionado
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

        {recentTransactions.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento registrado ainda"
            description="Seus gastos por foto, texto, voz ou entrada manual aparecerão aqui assim que a API de lançamentos for conectada."
            action={
              <button
                type="button"
                onClick={onOpenNewModal}
                className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3]"
              >
                Novo Lançamento
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-[#E2E8F0]/70 dark:divide-white/6">
            {recentTransactions.map((tx) => {
              const catLabel = CATEGORIES[tx.category].label;
              const isIncome = tx.type === 'income';

              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => onEditTransaction(tx)}
                    className="w-full min-h-[64px] py-3 px-2 -mx-2 rounded-xl flex items-center justify-between gap-4 text-left hover:bg-[#f2f3ff]/65 dark:hover:bg-[#171f33] transition-colors"
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

                    <span
                      className={`text-sm sm:text-base font-semibold shrink-0 ${
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
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
