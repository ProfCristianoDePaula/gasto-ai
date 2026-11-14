import { FormEvent, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  BudgetsResponse,
  CreateCategoryPayload,
  DashboardResponse,
  DbCategory,
  UpdateCategoryPayload,
} from '../types/finance';
import { formatCents, parseBrlInputToCents } from '../utils/finance';
import {
  CUSTOM_CATEGORY_COLOR_OPTIONS,
  CUSTOM_CATEGORY_ICON_OPTIONS,
  DynamicCategoryIcon,
} from './CategoryIcon';
import { CurrencyText } from './CurrencyText';
import { ErrorState, ListSkeleton } from './States';

interface BudgetsViewProps {
  budgetsData?: BudgetsResponse;
  dashboard?: DashboardResponse;
  categories: DbCategory[];
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onUpsertBudget: (categoryId: string | null, amountCents: number) => void;
  onCreateCategory: (payload: CreateCategoryPayload) => Promise<void>;
  onUpdateCategory: (id: string, payload: UpdateCategoryPayload) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

export function BudgetsView({
  budgetsData,
  dashboard,
  categories,
  isLoading,
  errorMessage,
  onRetry,
  onUpsertBudget,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: BudgetsViewProps) {
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalDraft, setTotalDraft] = useState('');
  const [totalError, setTotalError] = useState<string | null>(null);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [limitDraft, setLimitDraft] = useState('');
  const [limitError, setLimitError] = useState<string | null>(null);

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('tag');
  const [catColor, setCatColor] = useState(CUSTOM_CATEGORY_COLOR_OPTIONS[0]!);
  const [catError, setCatError] = useState<string | null>(null);
  const [catBusy, setCatBusy] = useState(false);

  const [renamingCatId, setRenamingCatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  if (isLoading) {
    return <ListSkeleton rows={4} />;
  }

  if (errorMessage) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  const budgetByCat = new Map<string, number>();
  for (const b of budgetsData?.categoryBudgets ?? []) {
    if (b.category_id) budgetByCat.set(b.category_id, Number(b.amount_cents));
  }

  const spentByCat = new Map<string, number>();
  for (const item of dashboard?.categories ?? []) {
    if (item.categoryId) spentByCat.set(item.categoryId, item.spentCents);
  }

  const explicitTotal = budgetsData?.totalBudgetCents ?? null;
  const sumCategoriesBudget = Array.from(budgetByCat.values()).reduce(
    (acc, v) => acc + v,
    0
  );
  const effectiveTotalBudget =
    explicitTotal !== null ? explicitTotal : sumCategoriesBudget;
  const totalSpent = dashboard?.totalCents ?? 0;
  const totalPct =
    effectiveTotalBudget > 0
      ? Math.min(100, (totalSpent / effectiveTotalBudget) * 100)
      : 0;

  const startEditTotal = () => {
    setEditingTotal(true);
    setTotalDraft(
      explicitTotal !== null && explicitTotal > 0
        ? (explicitTotal / 100).toFixed(2).replace('.', ',')
        : ''
    );
    setTotalError(null);
  };

  const handleSaveTotalBudget = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = totalDraft.trim();
    if (trimmed === '' || trimmed === '0' || trimmed === '0,00') {
      onUpsertBudget(null, 0);
      setEditingTotal(false);
      setTotalError(null);
      return;
    }
    const parsed = parseBrlInputToCents(trimmed);
    if (parsed === null) {
      setTotalError('Informe um valor válido ou deixe vazio para remover o teto.');
      return;
    }
    onUpsertBudget(null, parsed);
    setEditingTotal(false);
    setTotalError(null);
  };

  const startEditCatBudget = (catId: string, currentLimit: number) => {
    setEditingCatId(catId);
    setLimitDraft(
      currentLimit > 0
        ? (currentLimit / 100).toFixed(2).replace('.', ',')
        : ''
    );
    setLimitError(null);
  };

  const handleSaveCatBudget = (e: FormEvent, catId: string) => {
    e.preventDefault();
    const trimmed = limitDraft.trim();
    if (trimmed === '' || trimmed === '0' || trimmed === '0,00') {
      onUpsertBudget(catId, 0);
      setEditingCatId(null);
      setLimitError(null);
      return;
    }
    const parsed = parseBrlInputToCents(trimmed);
    if (parsed === null) {
      setLimitError('Informe um limite válido ou deixe vazio para remover.');
      return;
    }
    onUpsertBudget(catId, parsed);
    setEditingCatId(null);
    setLimitError(null);
  };

  const handleCreateCategorySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCatError(null);
    const trimmed = catName.trim();
    if (trimmed.length < 2) {
      setCatError('O nome da categoria deve ter pelo menos 2 caracteres.');
      return;
    }
    setCatBusy(true);
    try {
      await onCreateCategory({ name: trimmed, icon: catIcon, color: catColor });
      setCatName('');
      setShowNewCategory(false);
    } catch (err) {
      setCatError(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar a categoria.'
      );
    } finally {
      setCatBusy(false);
    }
  };

  const handleRenameSubmit = async (e: FormEvent, id: string) => {
    e.preventDefault();
    const trimmed = renameDraft.trim();
    if (trimmed.length < 2) return;
    setCatBusy(true);
    try {
      await onUpdateCategory(id, { name: trimmed });
      setRenamingCatId(null);
    } finally {
      setCatBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Orçamento Mensal Consolidado / Total */}
      <section aria-label="Orçamento mensal" className="space-y-4">
        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 shadow-xs dark:shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
                {explicitTotal !== null
                  ? 'Orçamento Mensal Total'
                  : 'Teto Mensal Consolidado'}
              </h2>
              <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
                {explicitTotal !== null
                  ? 'Limite geral definido para todas as despesas do mês'
                  : 'Soma dos limites por categoria (ou defina um teto total)'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-xl font-bold text-[#131b2e] dark:text-[#dae2fd]">
                <CurrencyText amountCents={totalSpent} />
                <span className="text-sm font-medium text-[#787586] dark:text-[#928ea1] ml-1.5">
                  de <CurrencyText amountCents={effectiveTotalBudget} />
                </span>
              </p>
              {!editingTotal && (
                <button
                  type="button"
                  onClick={startEditTotal}
                  className="h-9 px-3 rounded-xl text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#222a3d] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Pencil size={13} />
                  {explicitTotal !== null ? 'Editar total' : 'Definir teto'}
                </button>
              )}
            </div>
          </div>

          {editingTotal && (
            <form
              onSubmit={handleSaveTotalBudget}
              className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-white/8"
              noValidate
            >
              <label
                htmlFor="budget-total-input"
                className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7]"
              >
                Orçamento mensal total em R$ (deixe vazio para usar soma das categorias)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="budget-total-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="2500,00"
                  value={totalDraft}
                  onChange={(e) => {
                    setTotalDraft(e.target.value);
                    if (totalError) setTotalError(null);
                  }}
                  className="flex-1 min-w-[160px] h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm tabular-nums text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                />
                <button
                  type="submit"
                  className="h-10 px-3.5 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3] inline-flex items-center gap-1"
                >
                  <Check size={14} />
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTotal(false)}
                  className="h-10 px-3 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#474555] dark:text-[#c8c4d7]"
                >
                  Cancelar
                </button>
              </div>
              {totalError && (
                <p
                  role="alert"
                  className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab]"
                >
                  {totalError}
                </p>
              )}
            </form>
          )}

          <div className="h-2.5 w-full rounded-full bg-[#eaedff] dark:bg-[#0b1326] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${totalPct}%`,
                backgroundColor:
                  effectiveTotalBudget > 0 && totalSpent > effectiveTotalBudget
                    ? '#EF4444'
                    : totalPct >= 80
                      ? '#F59E0B'
                      : '#6d5ef5',
              }}
            />
          </div>
        </div>

        {/* Limites por categoria */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat) => {
            const limitCents = budgetByCat.get(cat.id) ?? 0;
            const spentCents = spentByCat.get(cat.id) ?? 0;
            const remainingCents = limitCents - spentCents;
            const usagePct =
              limitCents > 0
                ? Math.round((spentCents / limitCents) * 1000) / 10
                : 0;
            const clampedPct = Math.min(100, usagePct);

            const status: 'unset' | 'normal' | 'warning' | 'over' =
              limitCents === 0
                ? 'unset'
                : spentCents > limitCents
                  ? 'over'
                  : usagePct >= 80
                    ? 'warning'
                    : 'normal';

            const statusLabel =
              status === 'unset'
                ? 'Sem limite definido'
                : status === 'over'
                  ? `Acima do teto (${usagePct.toFixed(0)}%)`
                  : status === 'warning'
                    ? `Próximo do teto (${usagePct.toFixed(0)}%)`
                    : `Dentro do limite (${usagePct.toFixed(0)}%)`;

            const statusTextClass =
              status === 'unset'
                ? 'text-[#787586] dark:text-[#928ea1]'
                : status === 'over'
                  ? 'text-[#ba1a1a] dark:text-[#ffb4ab]'
                  : status === 'warning'
                    ? 'text-[#D97706] dark:text-[#F59E0B]'
                    : 'text-[#16A34A] dark:text-[#4edea3]';

            const barColor =
              status === 'over'
                ? '#EF4444'
                : status === 'warning'
                  ? '#F59E0B'
                  : cat.color;

            const isEditing = editingCatId === cat.id;

            return (
              <div
                key={cat.id}
                className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-5 shadow-xs dark:shadow-none flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <DynamicCategoryIcon icon={cat.icon} color={cat.color} />
                    <div>
                      <h3 className="text-sm font-bold text-[#131b2e] dark:text-[#dae2fd]">
                        {cat.name}
                      </h3>
                      <p className={`text-xs font-semibold mt-0.5 ${statusTextClass}`}>
                        {statusLabel}
                      </p>
                    </div>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEditCatBudget(cat.id, limitCents)}
                      aria-label={`Editar limite de ${cat.name}`}
                      className="h-9 px-3 rounded-xl text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] bg-[#f2f3ff] dark:bg-[#222a3d] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Pencil size={13} />
                      Editar limite
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form
                    onSubmit={(e) => handleSaveCatBudget(e, cat.id)}
                    className="space-y-2"
                    noValidate
                  >
                    <label
                      htmlFor={`budget-${cat.id}`}
                      className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7]"
                    >
                      Teto mensal (R$) — deixe vazio para remover
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`budget-${cat.id}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="500,00"
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
                        onClick={() => setEditingCatId(null)}
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
                        Gasto: <CurrencyText amountCents={spentCents} />
                      </span>
                      <span className="text-[#787586] dark:text-[#928ea1]">
                        {limitCents === 0
                          ? 'Defina um limite mensal'
                          : remainingCents >= 0
                            ? `Restam ${formatCents(remainingCents)}`
                            : `Excedido em ${formatCents(Math.abs(remainingCents))}`}
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

      {/* Gerenciar Categorias (CRUD real /api/categories) */}
      <section aria-label="Gerenciar categorias" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Categorias Personalizadas
            </h2>
            <p className="text-xs text-[#787586] dark:text-[#928ea1] mt-0.5">
              Crie, renomeie ou remova categorias além das 5 padrão
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowNewCategory((v) => !v);
              setCatError(null);
            }}
            className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] hover:bg-[#e2e7ff] dark:hover:bg-[#2d3449] inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} />
            Nova Categoria
          </button>
        </div>

        {showNewCategory && (
          <form
            onSubmit={handleCreateCategorySubmit}
            noValidate
            className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#6d5ef5]/40 p-5 shadow-xs dark:shadow-none space-y-4"
          >
            <h3 className="text-sm font-bold text-[#131b2e] dark:text-[#dae2fd]">
              Criar nova categoria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-cat-name"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1"
                >
                  Nome
                </label>
                <input
                  id="new-cat-name"
                  type="text"
                  maxLength={40}
                  placeholder="Ex: Saúde, Assinaturas, Pets"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                />
              </div>
              <div>
                <label
                  htmlFor="new-cat-icon"
                  className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1"
                >
                  Ícone
                </label>
                <select
                  id="new-cat-icon"
                  value={catIcon}
                  onChange={(e) => setCatIcon(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-sm text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                >
                  {CUSTOM_CATEGORY_ICON_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#474555] dark:text-[#c8c4d7] mb-1.5">
                Cor
              </span>
              <div className="flex flex-wrap gap-2">
                {CUSTOM_CATEGORY_COLOR_OPTIONS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCatColor(hex)}
                    aria-label={`Selecionar cor ${hex}`}
                    aria-pressed={catColor === hex}
                    className={`w-8 h-8 rounded-full border-2 ${
                      catColor === hex
                        ? 'border-[#131b2e] dark:border-white scale-110'
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            {catError && (
              <p
                role="alert"
                className="text-xs text-[#ba1a1a] dark:text-[#ffb4ab]"
              >
                {catError}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewCategory(false)}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#f2f3ff] dark:bg-[#222a3d] text-[#474555] dark:text-[#c8c4d7]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={catBusy}
                className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3] disabled:opacity-60"
              >
                {catBusy ? 'Salvando...' : 'Criar categoria'}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 divide-y divide-[#E2E8F0]/70 dark:divide-white/6">
          {categories.map((cat) => {
            const isRenaming = renamingCatId === cat.id;
            return (
              <div
                key={cat.id}
                className="px-5 py-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <DynamicCategoryIcon
                    icon={cat.icon}
                    color={cat.color}
                    size="sm"
                  />
                  {isRenaming ? (
                    <form
                      onSubmit={(e) => handleRenameSubmit(e, cat.id)}
                      className="flex items-center gap-2 flex-1 max-w-sm"
                    >
                      <input
                        type="text"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        className="flex-1 h-9 px-3 rounded-lg bg-[#faf8ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/10 text-xs text-[#131b2e] dark:text-[#dae2fd]"
                      />
                      <button
                        type="submit"
                        disabled={catBusy}
                        className="h-9 px-3 rounded-lg bg-[#6d5ef5] text-white text-xs font-semibold"
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingCatId(null)}
                        className="h-9 px-2.5 rounded-lg bg-[#f2f3ff] dark:bg-[#222a3d] text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#131b2e] dark:text-[#dae2fd] truncate">
                        {cat.name}
                      </p>
                      <p className="text-[11px] text-[#787586] dark:text-[#928ea1]">
                        {cat.is_default === 1
                          ? 'Categoria padrão'
                          : 'Categoria personalizada'}
                      </p>
                    </div>
                  )}
                </div>

                {!isRenaming && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingCatId(cat.id);
                        setRenameDraft(cat.name);
                      }}
                      aria-label={`Renomear ${cat.name}`}
                      className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#5442db] dark:hover:text-[#c5c0ff] hover:bg-[#eaedff] dark:hover:bg-[#222a3d]"
                    >
                      <Pencil size={15} />
                    </button>
                    {cat.is_default === 0 && (
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat.id)}
                        aria-label={`Excluir categoria ${cat.name}`}
                        className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab] hover:bg-[#ffdad6]/40 dark:hover:bg-[#93000a]/30"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
