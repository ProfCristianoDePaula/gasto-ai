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

export type ThemeMode = 'dark' | 'light';

export type AppView = 'overview' | 'transactions' | 'budgets';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  colorDark: string;
  colorLight: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number; // Always positive number; sign determined by type
  type: TransactionType;
  category: CategoryId;
  date: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CategoryBudget {
  category: CategoryId;
  limit: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM
  accent: 'primary' | 'secondary' | 'tertiary';
}

export interface TransactionFilters {
  search: string;
  category: CategoryId | 'all';
  type: 'all' | TransactionType;
  monthKey: string; // YYYY-MM or 'all'
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

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Nubank',
  'Cartão Crédito',
  'Pix',
  'Conta Corrente',
];
