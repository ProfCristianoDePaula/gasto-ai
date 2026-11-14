import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  LayoutDashboard,
  Moon,
  PiggyBank,
  Plus,
  RotateCcw,
  Sun,
} from 'lucide-react';
import { BudgetsView } from './components/BudgetsView';
import { OverviewView } from './components/OverviewView';
import { TransactionModal } from './components/TransactionModal';
import { TransactionsView } from './components/TransactionsView';
import {
  INITIAL_BUDGETS,
  INITIAL_GOALS,
  INITIAL_TRANSACTIONS,
} from './data/seedData';
import {
  AppView,
  CategoryBudget,
  CategoryId,
  SavingsGoal,
  ThemeMode,
  Transaction,
  TransactionFilters,
} from './types/finance';
import { formatMonthLabel, getMonthKey } from './utils/finance';

const STORAGE_KEYS = {
  transactions: 'gasto_transactions_v1',
  budgets: 'gasto_budgets_v1',
  goals: 'gasto_goals_v1',
  theme: 'gasto_theme_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() =>
    loadFromStorage<ThemeMode>(STORAGE_KEYS.theme, 'dark')
  );
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadFromStorage<Transaction[]>(STORAGE_KEYS.transactions, INITIAL_TRANSACTIONS)
  );
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() =>
    loadFromStorage<CategoryBudget[]>(STORAGE_KEYS.budgets, INITIAL_BUDGETS)
  );
  const [goals, setGoals] = useState<SavingsGoal[]>(() =>
    loadFromStorage<SavingsGoal[]>(STORAGE_KEYS.goals, INITIAL_GOALS)
  );

  const [monthKey, setMonthKey] = useState<string>('2026-11');
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    category: 'all',
    type: 'all',
    monthKey: '2026-11',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deletedTx, setDeletedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
    } catch {
      // Ignore storage quota errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.transactions,
        JSON.stringify(transactions)
      );
    } catch {
      // Ignore
    }
  }, [transactions]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets));
    } catch {
      // Ignore
    }
  }, [budgets]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.goals, JSON.stringify(goals));
    } catch {
      // Ignore
    }
  }, [goals]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>(['2026-11', '2026-10']);
    for (const tx of transactions) {
      set.add(getMonthKey(tx.date));
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const handleMonthChange = (nextMonth: string) => {
    setMonthKey(nextMonth);
    setFilters((prev) => ({ ...prev, monthKey: nextMonth }));
  };

  const handleSaveTransaction = (
    data: Omit<Transaction, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === existingId ? { ...data, id: existingId } : tx))
      );
    } else {
      const newTx: Transaction = {
        ...data,
        id: `tx-${Date.now()}`,
      };
      setTransactions((prev) => [newTx, ...prev]);
      const txMonth = getMonthKey(data.date);
      if (monthKey !== 'all' && txMonth !== monthKey) {
        handleMonthChange(txMonth);
      }
    }
    setEditingTx(null);
  };

  const handleDeleteTransaction = (id: string) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setDeletedTx(target);
  };

  const handleUndoDelete = () => {
    if (!deletedTx) return;
    setTransactions((prev) => [deletedTx, ...prev]);
    setDeletedTx(null);
  };

  const handleUpdateBudget = (category: CategoryId, newLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.category === category ? { ...b, limit: newLimit } : b))
    );
  };

  const handleContributeGoal = (goalId: string, amount: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId
          ? {
              ...g,
              currentAmount: Math.round((g.currentAmount + amount) * 100) / 100,
            }
          : g
      )
    );
  };

  const handleCreateGoal = (
    title: string,
    targetAmount: number,
    deadline: string
  ) => {
    const accents: Array<'primary' | 'secondary' | 'tertiary'> = [
      'primary',
      'secondary',
      'tertiary',
    ];
    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      title,
      targetAmount,
      currentAmount: 0,
      deadline,
      accent: accents[goals.length % accents.length],
    };
    setGoals((prev) => [...prev, newGoal]);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: typeof LayoutDashboard;
  }> = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'transactions', label: 'Lançamentos', icon: ArrowLeftRight },
    { id: 'budgets', label: 'Orçamentos', icon: PiggyBank },
  ];

  const pageTitle =
    activeView === 'overview'
      ? 'Visão Geral'
      : activeView === 'transactions'
        ? 'Lançamentos'
        : 'Orçamentos e Metas';

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] dark:bg-[#0b1326] dark:text-[#dae2fd] flex flex-col lg:flex-row">
      {/* Desktop Sidebar Rail */}
      <aside
        aria-label="Navegação principal"
        className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#ffffff] dark:bg-[#131b2e] border-r border-[#E2E8F0] dark:border-white/8 px-4 py-6 justify-between"
      >
        <div className="space-y-8">
          {/* Brand Wordmark */}
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

          {/* Nav Items */}
          <nav className="space-y-1.5" aria-label="Seções do aplicativo">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 whitespace-nowrap ${
                    active
                      ? 'bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff]'
                      : 'text-[#474555] dark:text-[#928ea1] hover:bg-[#f2f3ff] dark:hover:bg-[#171f33] hover:text-[#131b2e] dark:hover:text-[#dae2fd]'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Controls: Theme Toggle + User */}
        <div className="space-y-3 pt-4 border-t border-[#E2E8F0] dark:border-white/8">
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={
              theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'
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

          <div className="px-2 py-1.5 flex items-center gap-3">
            <span
              className="w-9 h-9 rounded-full bg-[#eaedff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] font-bold text-xs inline-flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              CP
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#131b2e] dark:text-[#dae2fd] truncate">
                Cristiano de Paula
              </p>
              <p className="text-[11px] text-[#787586] dark:text-[#928ea1] truncate">
                Conta Pessoal
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Top Header (56px) */}
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
              theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'
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

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-12">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6">
          {/* Workspace Header */}
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
                className="hidden sm:inline-flex h-11 px-5 rounded-xl bg-[#6d5ef5] hover:bg-[#5b4de3] text-white text-sm font-semibold items-center gap-2 shadow-[0_0_20px_-4px_rgba(109,94,245,0.45)] transition-colors whitespace-nowrap shrink-0"
              >
                <Plus size={17} />
                Novo Lançamento
              </button>
            </div>
          </div>

          {/* Undo Delete Notification */}
          {deletedTx && (
            <div
              role="status"
              className="rounded-xl bg-[#ffffff] dark:bg-[#171f33] border border-[#E2E8F0] dark:border-white/10 px-4 py-3 flex items-center justify-between gap-4 shadow-sm"
            >
              <span className="text-xs sm:text-sm text-[#131b2e] dark:text-[#dae2fd]">
                Lançamento <strong>{deletedTx.description}</strong> excluído.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleUndoDelete}
                  className="h-8 px-3 rounded-lg text-xs font-semibold text-[#5442db] dark:text-[#c5c0ff] bg-[#eaedff] dark:bg-[#222a3d] inline-flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  Desfazer
                </button>
                <button
                  type="button"
                  onClick={() => setDeletedTx(null)}
                  className="h-8 px-2 text-xs text-[#787586] dark:text-[#928ea1] hover:text-[#131b2e] dark:hover:text-[#dae2fd]"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* Active View */}
          {activeView === 'overview' && (
            <OverviewView
              transactions={transactions}
              budgets={budgets}
              monthKey={monthKey}
              theme={theme}
              onNavigateToTransactions={(cat) => {
                if (cat) {
                  setFilters((prev) => ({ ...prev, category: cat, monthKey }));
                }
                setActiveView('transactions');
              }}
              onNavigateToBudgets={() => setActiveView('budgets')}
              onEditTransaction={(tx) => {
                setEditingTx(tx);
                setIsModalOpen(true);
              }}
            />
          )}

          {activeView === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              filters={filters}
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
              onDeleteTransaction={handleDeleteTransaction}
              onOpenNewModal={() => {
                setEditingTx(null);
                setIsModalOpen(true);
              }}
              theme={theme}
            />
          )}

          {activeView === 'budgets' && (
            <BudgetsView
              transactions={transactions}
              budgets={budgets}
              goals={goals}
              monthKey={monthKey}
              theme={theme}
              onUpdateBudget={handleUpdateBudget}
              onContributeGoal={handleContributeGoal}
              onCreateGoal={handleCreateGoal}
            />
          )}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar (60px height) */}
      <nav
        aria-label="Navegação mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-[60px] bg-[#ffffff]/92 dark:bg-[#131b2e]/92 backdrop-blur-md border-t border-[#E2E8F0] dark:border-white/8 grid grid-cols-3 items-center px-2"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveView(item.id)}
              aria-current={active ? 'page' : undefined}
              className={`h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                active
                  ? 'text-[#5442db] dark:text-[#c5c0ff]'
                  : 'text-[#787586] dark:text-[#928ea1]'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Create / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTx(null);
        }}
        onSave={handleSaveTransaction}
        initialTransaction={editingTx}
        theme={theme}
        defaultMonthKey={monthKey}
      />
    </div>
  );
}
