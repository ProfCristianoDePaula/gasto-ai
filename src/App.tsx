import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
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
import { BudgetsView } from './components/BudgetsView';
import { LoginView } from './components/LoginView';
import { OverviewView } from './components/OverviewView';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import { api, ApiClientError, registerUnauthorizedHandler } from './lib/api';
import {
  CategoryBudget,
  SavingsGoal,
  ThemeMode,
  Transaction,
  TransactionFilters,
} from './types/finance';
import { formatMonthLabel, getCurrentMonthKey } from './utils/finance';

const THEME_STORAGE_KEY = 'gasto_theme_v1';

function loadTheme(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState<ThemeMode>(loadTheme);
  const currentMonthKey = useMemo(() => getCurrentMonthKey('America/Sao_Paulo'), []);
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey);
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    category: 'all',
    type: 'all',
    monthKey: currentMonthKey,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [stageNotice, setStageNotice] = useState<string | null>(null);

  // Registra redirecionamento global para /login em caso de 401 da API
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      navigate('/login', { replace: true });
    });
    return () => registerUnauthorizedHandler(null);
  }, [navigate]);

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

  // Verifica conectividade real com o Worker Hono (/api/health)
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
  });

  // Na Etapa 1 não há dados mockados: listas vazias até a criação do banco D1 (Etapas 2 e 3)
  const transactions: Transaction[] = [];
  const budgets: CategoryBudget[] = [];
  const goals: SavingsGoal[] = [];

  const isLoading = healthQuery.isLoading;
  const errorMessage =
    healthQuery.error instanceof ApiClientError
      ? healthQuery.error.message
      : healthQuery.isError
        ? 'Falha ao conectar com a API do Gastô.'
        : null;

  const availableMonths = useMemo(() => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const prevDate = new Date(year, month - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return [currentMonthKey, prevKey];
  }, [currentMonthKey]);

  const handleMonthChange = (nextMonth: string) => {
    setMonthKey(nextMonth);
    setFilters((prev) => ({ ...prev, monthKey: nextMonth }));
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
    { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight, end: false },
    { to: '/orcamentos', label: 'Orçamentos', icon: PiggyBank, end: false },
  ];

  const pageTitle =
    location.pathname === '/lancamentos'
      ? 'Lançamentos'
      : location.pathname === '/orcamentos'
        ? 'Orçamentos e Metas'
        : 'Visão Geral';

  return (
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

          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setIsModalOpen(true);
            }}
            className="h-10 px-3.5 rounded-xl bg-[#6d5ef5] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} />
            Novo
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
                {formatMonthLabel(monthKey)}
              </p>
            </div>

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
                <option value="all">Todos os meses</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingTx(null);
                  setIsModalOpen(true);
                }}
                className="hidden sm:inline-flex h-11 px-5 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] text-white text-sm font-semibold items-center gap-2 shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)] whitespace-nowrap shrink-0"
              >
                <Plus size={17} />
                Novo Lançamento
              </button>
            </div>
          </div>

          {stageNotice && (
            <div
              role="status"
              className="rounded-xl bg-[#ffffff] dark:bg-[#171f33] border border-[#6d5ef5]/35 px-4 py-3 flex items-center justify-between gap-4"
            >
              <span className="text-xs sm:text-sm text-[#131b2e] dark:text-[#dae2fd]">
                {stageNotice}
              </span>
              <button
                type="button"
                onClick={() => setStageNotice(null)}
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
                  transactions={transactions}
                  budgets={budgets}
                  monthKey={monthKey}
                  theme={theme}
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  onRetry={() => healthQuery.refetch()}
                  onNavigateToTransactions={(cat) => {
                    if (cat) {
                      setFilters((prev) => ({
                        ...prev,
                        category: cat,
                        monthKey,
                      }));
                    }
                    navigate('/lancamentos');
                  }}
                  onNavigateToBudgets={() => navigate('/orcamentos')}
                  onEditTransaction={(tx) => {
                    setEditingTx(tx);
                    setIsModalOpen(true);
                  }}
                  onOpenNewModal={() => {
                    setEditingTx(null);
                    setIsModalOpen(true);
                  }}
                />
              }
            />
            <Route
              path="/lancamentos"
              element={
                <TransactionsView
                  transactions={transactions}
                  filters={filters}
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  onRetry={() => healthQuery.refetch()}
                  onFiltersChange={(next) => {
                    setFilters(next);
                    if (next.monthKey !== monthKey) {
                      setMonthKey(next.monthKey);
                    }
                  }}
                  onEditTransaction={(tx) => {
                    setEditingTx(tx);
                    setIsModalOpen(true);
                  }}
                  onDeleteTransaction={() => {
                    setStageNotice(
                      'A exclusão persistente no D1 será conectada na Etapa 3.'
                    );
                  }}
                  onOpenNewModal={() => {
                    setEditingTx(null);
                    setIsModalOpen(true);
                  }}
                  theme={theme}
                />
              }
            />
            <Route
              path="/orcamentos"
              element={
                <BudgetsView
                  transactions={transactions}
                  budgets={budgets}
                  goals={goals}
                  monthKey={monthKey}
                  theme={theme}
                  isLoading={isLoading}
                  errorMessage={errorMessage}
                  onRetry={() => healthQuery.refetch()}
                  onUpdateBudget={() => {
                    setStageNotice(
                      'A gravação de orçamentos no D1 será conectada nas próximas etapas.'
                    );
                  }}
                  onContributeGoal={() => {
                    setStageNotice(
                      'A gravação de metas no D1 será conectada nas próximas etapas.'
                    );
                  }}
                  onCreateGoal={() => {
                    setStageNotice(
                      'A criação de metas no D1 será conectada nas próximas etapas.'
                    );
                  }}
                />
              }
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
          setEditingTx(null);
        }}
        onSave={() => {
          setStageNotice(
            'Validação concluída. O salvamento no banco D1 será ativado na Etapa 3.'
          );
        }}
        initialTransaction={editingTx}
        theme={theme}
        defaultMonthKey={monthKey}
      />
    </div>
  );
}
