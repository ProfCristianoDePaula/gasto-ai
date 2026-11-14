import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Moon,
  PiggyBank,
  Plus,
  Sun,
  User,
} from 'lucide-react';
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { AccountView } from './components/AccountView';
import { BudgetsView } from './components/BudgetsView';
import { LoginView } from './components/LoginView';
import { OverviewView } from './components/OverviewView';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import { useAuth } from './contexts/AuthContext';
import {
  useBudgetsQuery,
  useCategoriesQuery,
  useCreateCategoryMutation,
  useCreateExpenseMutation,
  useDashboardQuery,
  useDeleteCategoryMutation,
  useDeleteExpenseMutation,
  useExpensesInfiniteQuery,
  useUpdateCategoryMutation,
  useUpdateExpenseMutation,
  useUpsertBudgetMutation,
} from './hooks/useFinanceData';
import { api, ApiClientError, type ExpensesQueryInput } from './lib/api';
import type {
  ApiExpense,
  CreateExpensePayload,
  ExpensesFilterState,
  ThemeMode,
} from './types/finance';
import {
  formatMonthLabel,
  getCurrentMonthKey,
  parseBrlInputToCents,
} from './utils/finance';

const THEME_STORAGE_KEY = 'gasto_theme_v1';

function loadTheme(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function buildRecentMonths(baseMonthKey: string, count = 12): string[] {
  const [yearStr, monthStr] = baseMonthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const list: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(year, month - 1 - i, 1);
    list.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    );
  }
  return list;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, displayName, initials, signOut } = useAuth();

  const [theme, setTheme] = useState<ThemeMode>(loadTheme);

  const currentMonthKey = useMemo(
    () => getCurrentMonthKey('America/Sao_Paulo'),
    []
  );
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [filters, setFilters] = useState<ExpensesFilterState>({
    month: currentMonthKey,
    from: '',
    to: '',
    category: 'all',
    q: '',
    minReais: '',
    maxReais: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ApiExpense | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignora erro de armazenamento
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const meQuery = useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: api.me,
    enabled: Boolean(session),
  });

  const categoriesQuery = useCategoriesQuery();
  const dashboardQuery = useDashboardQuery(monthKey);
  const budgetsQuery = useBudgetsQuery();

  const apiExpenseFilters = useMemo<ExpensesQueryInput>(() => {
    const minParsed = filters.minReais.trim()
      ? parseBrlInputToCents(filters.minReais)
      : null;
    const maxParsed = filters.maxReais.trim()
      ? parseBrlInputToCents(filters.maxReais)
      : null;

    // Se o usuário preencheu De/Até explicitamente, prioriza o intervalo sobre o mês
    const useDateRange = Boolean(filters.from || filters.to);
    return {
      month: useDateRange ? undefined : monthKey,
      from: filters.from || undefined,
      to: filters.to || undefined,
      category: filters.category !== 'all' ? filters.category : undefined,
      q: filters.q.trim() || undefined,
      min: minParsed ?? undefined,
      max: maxParsed ?? undefined,
      limit: 20,
    };
  }, [filters, monthKey]);

  const expensesQuery = useExpensesInfiniteQuery(apiExpenseFilters);

  const createExpenseMut = useCreateExpenseMutation();
  const updateExpenseMut = useUpdateExpenseMutation();
  const deleteExpenseMut = useDeleteExpenseMutation();
  const upsertBudgetMut = useUpsertBudgetMutation();
  const createCategoryMut = useCreateCategoryMutation();
  const updateCategoryMut = useUpdateCategoryMutation();
  const deleteCategoryMut = useDeleteCategoryMutation();

  const availableMonths = useMemo(
    () => buildRecentMonths(currentMonthKey, 12),
    [currentMonthKey]
  );

  const flattenedExpenses = useMemo(
    () => expensesQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [expensesQuery.data]
  );

  const handleMonthChange = (nextMonth: string) => {
    setMonthKey(nextMonth);
    setFilters((prev) => ({ ...prev, month: nextMonth }));
  };

  const handleSaveExpense = (
    payload: CreateExpensePayload,
    existingId?: string
  ) => {
    if (existingId) {
      updateExpenseMut.mutate(
        { id: existingId, payload },
        {
          onError: (err) => {
            setNotice(
              err instanceof ApiClientError
                ? err.message
                : 'Não foi possível atualizar a despesa.'
            );
          },
        }
      );
    } else {
      createExpenseMut.mutate(payload, {
        onError: (err) => {
          setNotice(
            err instanceof ApiClientError
              ? err.message
              : 'Não foi possível salvar a despesa.'
          );
        },
      });
    }
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpenseMut.mutate(id, {
      onError: (err) => {
        setNotice(
          err instanceof ApiClientError
            ? err.message
            : 'Não foi possível excluir a despesa.'
        );
      },
    });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await api.expenses.exportCsv(apiExpenseFilters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gasto-despesas-${monthKey}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setNotice(
        err instanceof ApiClientError
          ? err.message
          : 'Falha ao exportar despesas para CSV.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<LoginView />} />
      </Routes>
    );
  }

  const navItems = [
    { to: '/', label: 'Visão Geral', icon: LayoutDashboard, end: true },
    { to: '/lancamentos', label: 'Despesas', icon: ArrowLeftRight, end: false },
    { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank, end: false },
  ];

  const pageTitle =
    location.pathname === '/lancamentos'
      ? 'Despesas'
      : location.pathname === '/orcamentos'
        ? 'Orçamentos e Categorias'
        : location.pathname === '/conta'
          ? 'Minha Conta'
          : 'Visão Geral';

  const userEmail = meQuery.data?.user.email ?? session?.user.email ?? null;
  const shownName = displayName ?? userEmail;
  const categories =
    categoriesQuery.data ?? meQuery.data?.categories ?? [];
  const firstPage = expensesQuery.data?.pages[0];

  const dashboardErrorMsg =
    dashboardQuery.error instanceof ApiClientError
      ? dashboardQuery.error.message
      : dashboardQuery.error
        ? 'Não foi possível carregar os indicadores do mês.'
        : null;

  const expensesErrorMsg =
    expensesQuery.error instanceof ApiClientError
      ? expensesQuery.error.message
      : expensesQuery.error
        ? 'Não foi possível carregar suas despesas.'
        : null;

  const budgetsError = budgetsQuery.error ?? categoriesQuery.error;
  const budgetsErrorMsg =
    budgetsError instanceof ApiClientError
      ? budgetsError.message
      : budgetsError
        ? 'Não foi possível carregar os orçamentos.'
        : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] dark:bg-[#0b1326] dark:text-[#dae2fd] flex flex-col lg:flex-row">
        {/* Sidebar Desktop */}
        <aside
          aria-label="Navegação principal"
          className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#ffffff] dark:bg-[#131b2e] border-r border-[#E2E8F0] dark:border-white/8 px-4 py-6 justify-between"
        >
          <div className="space-y-8">
            <div className="px-2 flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl bg-[#6d5ef5] text-white font-extrabold text-lg inline-flex items-center justify-center shadow-[0_0_20px_-4px_rgba(109,94,245,0.5)]"
                aria-hidden="true"
              >
                G
              </span>
              <span className="text-xl font-extrabold tracking-tight text-[#131b2e] dark:text-[#dae2fd] whitespace-nowrap">
                Gastô
              </span>
            </div>

            <nav className="space-y-1.5" aria-label="Seções do aplicativo">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `w-full h-11 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff]'
                          : 'text-[#474555] dark:text-[#928ea1] hover:bg-[#f2f3ff] dark:hover:bg-[#171f33] hover:text-[#131b2e] dark:hover:text-[#dae2fd]'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-white/8">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={
                theme === 'dark'
                  ? 'Alternar para modo claro'
                  : 'Alternar para modo escuro'
              }
              className="w-full h-11 px-3.5 rounded-xl text-xs font-semibold flex items-center justify-between bg-[#f2f3ff] dark:bg-[#0b1326] border border-[#E2E8F0] dark:border-white/8 text-[#131b2e] dark:text-[#dae2fd] hover:border-[#6d5ef5]/50"
            >
              <span className="inline-flex items-center gap-2.5">
                {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </span>
              <span className="text-[11px] text-[#787586] dark:text-[#928ea1]">
                Alternar
              </span>
            </button>

            {shownName ? (
              <div className="px-1 py-1 flex items-center justify-between gap-2">
                <NavLink
                  to="/conta"
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 min-w-0 flex-1 rounded-xl px-1.5 py-1 ${
                      isActive
                        ? 'bg-[#eaedff] dark:bg-[#222a3d]'
                        : 'hover:bg-[#f2f3ff] dark:hover:bg-[#171f33]'
                    }`
                  }
                >
                  <span
                    className="w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center shrink-0 font-bold text-xs uppercase"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#131b2e] dark:text-[#dae2fd] truncate">
                      {shownName}
                    </p>
                    <p className="text-[11px] text-[#787586] dark:text-[#928ea1] truncate">
                      {userEmail && shownName !== userEmail
                        ? userEmail
                        : categories.length > 0
                          ? `${categories.length} categorias ativas`
                          : 'Minha conta'}
                    </p>
                  </div>
                </NavLink>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sair da conta"
                  className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-[#787586] dark:text-[#928ea1] hover:text-[#ba1a1a] dark:hover:text-[#ffb4ab] hover:bg-[#ffdad6]/30 dark:hover:bg-[#93000a]/30 shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="px-2 py-1.5 rounded-xl flex items-center gap-3 hover:bg-[#f2f3ff] dark:hover:bg-[#171f33]"
              >
                <span
                  className="w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center shrink-0"
                  aria-hidden="true"
                >
                  <User size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#131b2e] dark:text-[#dae2fd] truncate">
                    Entrar na conta
                  </p>
                  <p className="text-[11px] text-[#787586] dark:text-[#928ea1] truncate">
                    Sessão não iniciada
                  </p>
                </div>
              </NavLink>
            )}
          </div>
        </aside>

        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 bg-[#ffffff]/90 dark:bg-[#131b2e]/90 backdrop-blur-md border-b border-[#E2E8F0] dark:border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-8 h-8 rounded-lg bg-[#6d5ef5] text-white font-extrabold text-sm inline-flex items-center justify-center"
              aria-hidden="true"
            >
              G
            </span>
            <span className="text-base font-extrabold tracking-tight text-[#131b2e] dark:text-[#dae2fd] whitespace-nowrap">
              Gastô
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={
                theme === 'dark'
                  ? 'Alternar para modo claro'
                  : 'Alternar para modo escuro'
              }
              className="w-10 h-10 rounded-xl inline-flex items-center justify-center bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd]"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {shownName && (
              <>
                <NavLink
                  to="/conta"
                  aria-label="Minha conta"
                  className="w-10 h-10 rounded-xl inline-flex items-center justify-center bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd] text-xs font-bold"
                >
                  {initials}
                </NavLink>
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Sair da conta"
                  className="w-10 h-10 rounded-xl inline-flex items-center justify-center bg-[#f2f3ff] dark:bg-[#222a3d] text-[#131b2e] dark:text-[#dae2fd]"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingExpense(null);
                setIsModalOpen(true);
              }}
              className="h-10 px-3.5 rounded-xl bg-[#6d5ef5] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={15} />
              Nova
            </button>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 min-w-0 pb-24 lg:pb-12">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-[30px] font-bold tracking-tight text-[#131b2e] dark:text-[#dae2fd] text-balance">
                  {pageTitle}
                </h1>
                <p className="text-xs sm:text-sm text-[#474555] dark:text-[#928ea1] mt-0.5">
                  {location.pathname === '/conta'
                    ? 'Gerencie seu perfil e dados armazenados'
                    : formatMonthLabel(monthKey)}
                </p>
              </div>

              {location.pathname !== '/conta' && (
                <div className="flex items-center gap-3">
                  <label htmlFor="month-select" className="sr-only">
                    Selecionar mês de referência
                  </label>
                  <select
                    id="month-select"
                    value={monthKey}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="h-11 px-3.5 rounded-xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/10 text-xs sm:text-sm font-semibold text-[#131b2e] dark:text-[#dae2fd] focus:outline-none focus:border-[#6d5ef5]"
                  >
                    {availableMonths.map((m) => (
                      <option key={m} value={m}>
                        {formatMonthLabel(m)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingExpense(null);
                      setIsModalOpen(true);
                    }}
                    className="hidden sm:inline-flex h-11 px-5 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] text-white text-sm font-semibold items-center gap-2 shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)] whitespace-nowrap shrink-0"
                  >
                    <Plus size={17} />
                    Nova despesa
                  </button>
                </div>
              )}
            </div>

            {notice && (
              <div
                role="alert"
                className="rounded-xl bg-[#ffffff] dark:bg-[#171f33] border border-[#ba1a1a]/35 px-4 py-3 flex items-center justify-between gap-4"
              >
                <span className="text-xs sm:text-sm text-[#ba1a1a] dark:text-[#ffb4ab]">
                  {notice}
                </span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] shrink-0"
                >
                  Fechar
                </button>
              </div>
            )}

            <Routes>
              <Route
                path="/"
                element={
                  <OverviewView
                    dashboard={dashboardQuery.data}
                    monthKey={monthKey}
                    theme={theme}
                    isLoading={dashboardQuery.isLoading}
                    errorMessage={dashboardErrorMsg}
                    onRetry={() => dashboardQuery.refetch()}
                    onNavigateToTransactions={(catId) => {
                      setFilters((prev) => ({
                        ...prev,
                        category: catId ?? 'all',
                        month: monthKey,
                      }));
                      navigate('/lancamentos');
                    }}
                    onNavigateToBudgets={() => navigate('/orcamentos')}
                    onEditExpense={(expense) => {
                      setEditingExpense(expense);
                      setIsModalOpen(true);
                    }}
                    onOpenNewModal={() => {
                      setEditingExpense(null);
                      setIsModalOpen(true);
                    }}
                  />
                }
              />
              <Route
                path="/lancamentos"
                element={
                  <TransactionsView
                    expenses={flattenedExpenses}
                    totalCount={firstPage?.totalCount ?? 0}
                    totalCents={firstPage?.totalCents ?? 0}
                    categories={categories}
                    filters={filters}
                    isLoading={expensesQuery.isLoading}
                    isFetchingMore={expensesQuery.isFetchingNextPage}
                    hasMore={Boolean(expensesQuery.hasNextPage)}
                    isExporting={isExporting}
                    errorMessage={expensesErrorMsg}
                    onRetry={() => expensesQuery.refetch()}
                    onFiltersChange={setFilters}
                    onLoadMore={() => expensesQuery.fetchNextPage()}
                    onExportCsv={handleExportCsv}
                    onEditExpense={(expense) => {
                      setEditingExpense(expense);
                      setIsModalOpen(true);
                    }}
                    onDeleteExpense={handleDeleteExpense}
                    onOpenNewModal={() => {
                      setEditingExpense(null);
                      setIsModalOpen(true);
                    }}
                  />
                }
              />
              <Route
                path="/orcamentos"
                element={
                  <BudgetsView
                    budgetsData={budgetsQuery.data}
                    dashboard={dashboardQuery.data}
                    categories={categories}
                    isLoading={
                      budgetsQuery.isLoading || categoriesQuery.isLoading
                    }
                    errorMessage={budgetsErrorMsg}
                    onRetry={() => {
                      budgetsQuery.refetch();
                      categoriesQuery.refetch();
                      dashboardQuery.refetch();
                    }}
                    onUpsertBudget={(catId, amountCents) => {
                      upsertBudgetMut.mutate(
                        { categoryId: catId, amountCents },
                        {
                          onError: (err) => {
                            setNotice(
                              err instanceof ApiClientError
                                ? err.message
                                : 'Não foi possível salvar o orçamento.'
                            );
                          },
                        }
                      );
                    }}
                    onCreateCategory={async (payload) => {
                      await createCategoryMut.mutateAsync(payload);
                    }}
                    onUpdateCategory={async (id, payload) => {
                      await updateCategoryMut.mutateAsync({ id, payload });
                    }}
                    onDeleteCategory={async (id) => {
                      try {
                        await deleteCategoryMut.mutateAsync(id);
                      } catch (err) {
                        setNotice(
                          err instanceof ApiClientError
                            ? err.message
                            : 'Não foi possível excluir a categoria.'
                        );
                      }
                    }}
                  />
                }
              />
              <Route
                path="/conta"
                element={<AccountView categoriesCount={categories.length} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* Bottom Tab Bar Mobile */}
        <nav
          aria-label="Navegação mobile"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[60px] bg-[#ffffff]/92 dark:bg-[#131b2e]/92 backdrop-blur-md border-t border-[#E2E8F0] dark:border-white/8 grid grid-cols-3 items-center px-2"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${
                    isActive
                      ? 'text-[#5442db] dark:text-[#c5c0ff]'
                      : 'text-[#787586] dark:text-[#928ea1]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
          initialExpense={editingExpense}
          categories={categories}
          defaultMonthKey={monthKey}
          isSubmitting={
            createExpenseMut.isPending || updateExpenseMut.isPending
          }
        />
      </div>
    </ProtectedRoute>
  );
}
