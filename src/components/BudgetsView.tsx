import { FormEvent, useState } from 'react';
import { Check, Pencil, Plus, Target } from 'lucide-react';
import {
  CategoryBudget,
  CategoryId,
  SavingsGoal,
  ThemeMode,
  Transaction,
} from '../types/finance';
import {
  computeCategoryBreakdown,
  formatBrl,
  parseBrlInput,
} from '../utils/finance';
import { CategoryIcon, getCategoryColor } from './CategoryIcon';
import { CurrencyText } from './CurrencyText';

interface BudgetsViewProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: SavingsGoal[];
  monthKey: string;
  theme: ThemeMode;
  onUpdateBudget: (category: CategoryId, newLimit: number) => void;
  onContributeGoal: (goalId: string, amount: number) => void;
  onCreateGoal: (title: string, targetAmount: number, deadline: string) => void;
}

export function BudgetsView({
  transactions,
  budgets,
  goals,
  monthKey,
  theme,
  onUpdateBudget,
  onContributeGoal,
  onCreateGoal,
}: BudgetsViewProps) {
  const breakdown = computeCategoryBreakdown(transactions, budgets, monthKey);

  const [editingCat, setEditingCat] = useState<CategoryId | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);

  const [contributingGoalId, setContributingGoalId] = useState<string | null>(
    null
  );
  const [contribDraft, setContribDraft] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);

  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('2027-06');
  const [goalError, setGoalError] = useState<string | null>(null);

  const totalBudget = budgets.reduce((acc, b) => acc + b.limit, 0);
  const totalSpent = breakdown.reduce((acc, b) => acc + b.spent, 0);
  const totalPct =
    totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  const startEditBudget = (cat: CategoryId, currentLimit: number) => {
    setEditingCat(cat);
    setLimitDraft(currentLimit.toFixed(2).replace('.', ','));
    setLimitError(null);
  };

  const handleSaveBudget = (e: FormEvent, cat: CategoryId) => {
    e.preventDefault();
    const parsed = parseBrlInput(limitDraft);
    if (parsed === null) {
      setLimitError('Informe um limite válido maior que zero.');
      return;
    }
    onUpdateBudget(cat, parsed);
    setEditingCat(null);
    setLimitError(null);
  };

  const handleSaveContribution = (e: FormEvent, goalId: string) => {
    e.preventDefault();
    const parsed = parseBrlInput(contribDraft);
    if (parsed === null) {
      setContribError('Informe um valor válido maior que zero.');
      return;
    }
    onContributeGoal(goalId, parsed);
    setContributingGoalId(null);
    setContribDraft('');
    setContribError(null);
  };

  const handleCreateGoalSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = goalTitle.trim();
    if (trimmed.length < 2) {
      setGoalError('Informe o nome da meta.');
      return;
    }
    const parsedTarget = parseBrlInput(goalTarget);
    if (parsedTarget === null) {
      setGoalError('Informe um valor alvo válido maior que zero.');
      return;
    }
    onCreateGoal(trimmed, parsedTarget, goalDeadline || '2027-12');
    setShowNewGoal(false);
    setGoalTitle('');
    setGoalTarget('');
    setGoalError(null);
  };

  return (
    <div className="space-y-8">
      {/* Category Budgets Section */}
      <section aria-label="Orçamentos por categoria" className="space-y-4">
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                Teto Mensal Consolidado
              </h2>
              <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                Soma dos limites definidos para as 5 categorias
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-bold text-[#131b2e] dark:text-[#dae2fd]">
                <CurrencyText amount={totalSpent} />
                <span className="text-sm font-medium text-[#787586] dark:text-[#928ea1] ml-1.5">
                  de <CurrencyText amount={totalBudget} />
                </span>
              </p>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[#eaedff] dark:bg-[#0b1326] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#6d5ef5] transition-all duration-300"
              style={{ width: `${totalPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {breakdown.map((item) => {
            const color = getCategoryColor(item.meta.id, theme);
            const isEditing = editingCat === item.meta.id;
            const clampedPct = Math.min(100, item.budgetUsagePct);

            const statusLabel =
              item.status === 'over'
                ? `Acima do teto (${item.budgetUsagePct.toFixed(0)}%)`
                : item.status === 'warning'
                  ? `Próximo do teto (${item.budgetUsagePct.toFixed(0)}%)`
                  : `Dentro do limite (${item.budgetUsagePct.toFixed(0)}%)`;

            const statusTextClass =
              item.status === 'over'
                ? 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                : item.status === 'warning'
                  ? 'text-[#D97706] dark:text-[#F59E0B]'
                  : 'text-[#16A34A] dark:text-[#4edea3]';

            const barColor =
              item.status === 'over'
                ? '#EF4444'
                : item.status === 'warning'
                  ? '#F59E0B'
                  : color;

            return (
              <div
                key={item.meta.id}
                className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CategoryIcon category={item.meta.id} theme={theme} />
                    <div>
                      <h3 className="text-sm font-bold text-[#131b2e] dark:text-[#dae2fd]">
                        {item.meta.label}
                      </h3>
                      <p className={`text-xs font-semibold mt-0.5 ${statusTextClass}`}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        startEditBudget(item.meta.id, item.limit)
                      }
                      aria-label={`Editar limite de ${item.meta.label}`}
                      className="h-9 px-3 rounded-xl text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#222a3d] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Pencil size={13} />
                      Editar limite
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form
                    onSubmit={(e) => handleSaveBudget(e, item.meta.id)}
                    className="space-y-2"
                    noValidate
                  >
                    <label
                      htmlFor={`budget-${item.meta.id}`}
                      className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7]"
                    >
                      Novo teto mensal (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`budget-${item.meta.id}`}
                        type="text"
                        inputMode="decimal"
                        value={limitDraft}
                        onChange={(e) => {
                          setLimitDraft(e.target.value);
                          if (limitError) setLimitError(null);
                        }}
                        className="flex-1 h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                      />
                      <button
                        type="submit"
                        className="h-10 px-3.5 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3] inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        <Check size={14} />
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCat(null)}
                        className="h-10 px-3 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#474555] dark:text-[#c8c4d7] whitespace-nowrap"
                      >
                        Cancelar
                      </button>
                    </div>
                    {limitError && (
                      <p
                        role="alert"
                        className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab]"
                      >
                        {limitError}
                      </p>
                    )}
                  </form>
                ) : (
                  <div>
                    <div className="flex items-baseline justify-between text-xs mb-2 tabular-nums">
                      <span className="font-semibold text-[#131b2e] dark:text-[#dae2fd]">
                        Gasto: <CurrencyText amount={item.spent} />
                      </span>
                      <span className="text-[#787586] dark:text-[#928ea1]">
                        {item.remaining >= 0
                          ? `Restam ${formatBrl(item.remaining)}`
                          : `Excedido em ${formatBrl(Math.abs(item.remaining))}`}
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Savings Goals Section */}
      <section aria-label="Metas financeiras" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Metas de Economia
            </h2>
            <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
              Acompanhe reservas e faça novos aportes
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowNewGoal((v) => !v);
              setGoalError(null);
            }}
            className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} />
            Nova Meta
          </button>
        </div>

        {showNewGoal && (
          <form
            onSubmit={handleCreateGoalSubmit}
            noValidate
            className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#6d5ef5]/40 p-5 shadow-xs dark:shadow-none space-y-4"
          >
            <h3 className="text-sm font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Criar nova meta financeira
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="new-goal-title"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1"
                >
                  Objetivo
                </label>
                <input
                  id="new-goal-title"
                  type="text"
                  placeholder="Ex: Intercâmbio"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                />
              </div>
              <div>
                <label
                  htmlFor="new-goal-target"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1"
                >
                  Valor alvo (R$)
                </label>
                <input
                  id="new-goal-target"
                  type="text"
                  inputMode="decimal"
                  placeholder="10000,00"
                  value={goalTarget}
                  onChange={(e) => setGoalTarget(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                />
              </div>
              <div>
                <label
                  htmlFor="new-goal-deadline"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1"
                >
                  Prazo
                </label>
                <input
                  id="new-goal-deadline"
                  type="month"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                />
              </div>
            </div>
            {goalError && (
              <p
                role="alert"
                className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab]"
              >
                {goalError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGoal(false)}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#474555] dark:text-[#c8c4d7]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3]"
              >
                Criar meta
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {goals.map((goal) => {
            const pct = Math.min(
              100,
              Math.round((goal.currentAmount / goal.targetAmount) * 100)
            );
            const isContributing = contributingGoalId === goal.id;
            const accentHex =
              goal.accent === 'tertiary'
                ? theme === 'dark'
                  ? '#4edea3'
                  : '#10B981'
                : goal.accent === 'secondary'
                  ? theme === 'dark'
                    ? '#4cd7f6'
                    : '#06B6D4'
                  : '#6d5ef5';

            return (
              <div
                key={goal.id}
                className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${accentHex}1F`,
                        color: accentHex,
                      }}
                      aria-hidden="true"
                    >
                      <Target size={18} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#131b2e] dark:text-[#dae2fd]">
                        {goal.title}
                      </h3>
                      <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                        Prazo {goal.deadline} · {pct}% concluído
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between text-xs mb-2 tabular-nums">
                    <span className="font-bold text-[#131b2e] dark:text-[#dae2fd]">
                      <CurrencyText amount={goal.currentAmount} />
                    </span>
                    <span className="text-[#787586] dark:text-[#928ea1]">
                      Meta: <CurrencyText amount={goal.targetAmount} />
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#eaedff] dark:bg-[#0b1326] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: accentHex }}
                    />
                  </div>
                </div>

                {isContributing ? (
                  <form
                    onSubmit={(e) => handleSaveContribution(e, goal.id)}
                    className="space-y-2"
                    noValidate
                  >
                    <label
                      htmlFor={`contrib-${goal.id}`}
                      className="sr-only"
                    >
                      Valor do aporte para {goal.title}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`contrib-${goal.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="200,00"
                        value={contribDraft}
                        onChange={(e) => {
                          setContribDraft(e.target.value);
                          if (contribError) setContribError(null);
                        }}
                        className="flex-1 h-9 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                      />
                      <button
                        type="submit"
                        className="h-9 px-3 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3] whitespace-nowrap"
                      >
                        Aportar
                      </button>
                    </div>
                    {contribError && (
                      <p
                        role="alert"
                        className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab]"
                      >
                        {contribError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setContributingGoalId(goal.id);
                      setContribDraft('');
                      setContribError(null);
                    }}
                    className="w-full h-10 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449]"
                  >
                    + Aportar na meta
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
