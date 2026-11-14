export type ThemeMode = 'dark' | 'light';

export type ExpenseSource = 'image' | 'text' | 'voice' | 'manual';

export interface HealthStatus {
  ok: boolean;
  service: string;
  timezone: string;
  imageStorage: 'r2' | 'thumbnail';
  maxThumbnailBytes: number;
  timestamp: string;
}

export interface DbCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_default: number;
  created_at: string;
}

export interface DbBudget {
  id: string;
  user_id: string;
  category_id: string | null;
  amount_cents: number;
  created_at: string;
}

export interface ApiExpense {
  id: string;
  user_id: string;
  amount_cents: number;
  expense_date: string;
  merchant: string | null;
  category_id: string | null;
  notes: string | null;
  source: ExpenseSource;
  image_key: string | null;
  thumbnail: string | null;
  ai_confidence: number | null;
  ai_raw: string | null;
  content_hash: string | null;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

export interface PaginatedExpensesResponse {
  items: ApiExpense[];
  nextCursor: string | null;
  totalCount: number;
  totalCents: number;
}

export interface ExpensesFilterState {
  month: string; // YYYY-MM ou 'all'
  from: string; // YYYY-MM-DD ou ''
  to: string; // YYYY-MM-DD ou ''
  category: string; // categoryId ou 'all'
  q: string;
  minReais: string;
  maxReais: string;
}

export interface CreateExpensePayload {
  amountCents: number;
  expenseDate: string;
  merchant: string;
  categoryId: string | null;
  notes: string | null;
  source?: ExpenseSource;
}

export interface UpdateExpensePayload {
  amountCents?: number;
  expenseDate?: string;
  merchant?: string;
  categoryId?: string | null;
  notes?: string | null;
}

export interface CreateCategoryPayload {
  name: string;
  icon: string;
  color: string;
}

export interface UpdateCategoryPayload {
  name?: string;
  icon?: string;
  color?: string;
}

export interface BudgetsResponse {
  totalBudgetCents: number | null;
  budgets: DbBudget[];
  categoryBudgets: DbBudget[];
  categories: DbCategory[];
}

export interface DailySeriesPoint {
  date: string; // YYYY-MM-DD
  day: number;
  totalCents: number;
  expenseCount: number;
}

export interface DashboardCategoryItem {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  spentCents: number;
  expenseCount: number;
  sharePct: number;
  budgetCents: number;
  remainingCents: number;
  budgetUsagePct: number;
  status: 'unset' | 'normal' | 'warning' | 'over';
}

export interface DashboardBudgetStatus {
  totalLimitCents: number;
  explicitTotalBudgetCents: number | null;
  sumCategoryBudgetsCents: number;
  spentCents: number;
  remainingCents: number;
  usagePct: number;
  status: 'unset' | 'normal' | 'warning' | 'over';
}

export interface DashboardResponse {
  month: string;
  previousMonth: string;
  totalCents: number;
  expenseCount: number;
  previousMonthTotalCents: number;
  variationPct: number | null;
  totalExpensesAllTime: number;
  dailySeries: DailySeriesPoint[];
  categories: DashboardCategoryItem[];
  recentExpenses: ApiExpense[];
  budgetStatus: DashboardBudgetStatus;
}

export interface MeResponse {
  user: {
    id: string;
    email: string | null;
  };
  categories: DbCategory[];
}

export interface DeleteMyDataResponse {
  ok: boolean;
  deleted: {
    expenses: number;
    budgets: number;
    merchantRules: number;
    customCategories: number;
    receiptImages: number;
  };
}

// Mantidos para compatibilidade com utilitários puros e testes unitários existentes
export type CategoryId =
  | 'alimentacao'
  | 'transporte'
  | 'educacao'
  | 'lazer'
  | 'outros';

export type TransactionType = 'expense' | 'income';

export type PaymentMethod =
  | 'Nubank'
  | 'Cartão Crédito'
  | 'Pix'
  | 'Conta Corrente';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  colorDark: string;
  colorLight: string;
}

export interface Transaction {
  id: string;
  description: string;
  amountCents: number;
  type: TransactionType;
  category: CategoryId;
  date: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CategoryBudget {
  category: CategoryId;
  limitCents: number;
}

export interface TransactionFilters {
  search: string;
  category: CategoryId | 'all';
  type: 'all' | TransactionType;
  monthKey: string;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  alimentacao: {
    id: 'alimentacao',
    label: 'Alimentação',
    colorDark: '#F97316',
    colorLight: '#EA580C',
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    colorDark: '#3B82F6',
    colorLight: '#2563EB',
  },
  educacao: {
    id: 'educacao',
    label: 'Educação',
    colorDark: '#8B5CF6',
    colorLight: '#7C3AED',
  },
  lazer: {
    id: 'lazer',
    label: 'Lazer',
    colorDark: '#EC4899',
    colorLight: '#DB2777',
  },
  outros: {
    id: 'outros',
    label: 'Outros',
    colorDark: '#64748B',
    colorLight: '#64748B',
  },
};

export const CATEGORY_LIST: CategoryMeta[] = [
  CATEGORIES.alimentacao,
  CATEGORIES.transporte,
  CATEGORIES.educacao,
  CATEGORIES.lazer,
  CATEGORIES.outros,
];
