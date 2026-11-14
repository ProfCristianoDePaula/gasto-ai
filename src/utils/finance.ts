import {
  CATEGORIES,
  CATEGORY_LIST,
  CategoryBudget,
  CategoryId,
  CategoryMeta,
  Transaction,
  TransactionFilters,
} from '../types/finance';

export interface BrlParts {
  sign: '' | '+' | '-';
  symbol: 'R$';
  value: string;
}

export function formatBrlParts(
  amount: number,
  options?: { signed?: boolean; type?: 'income' | 'expense' | 'neutral' }
): BrlParts {
  const abs = Math.abs(Number.isFinite(amount) ? amount : 0);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);

  let sign: '' | '+' | '-' = '';
  if (options?.type === 'income') {
    sign = '+';
  } else if (options?.type === 'expense') {
    sign = '-';
  } else if (options?.signed) {
    if (amount < 0) sign = '-';
    else if (amount > 0) sign = '+';
  } else if (amount < 0) {
    sign = '-';
  }

  return {
    sign,
    symbol: 'R$',
    value: formatted,
  };
}

export function formatBrl(
  amount: number,
  options?: { signed?: boolean; type?: 'income' | 'expense' | 'neutral' }
): string {
  const { sign, symbol, value } = formatBrlParts(amount, options);
  return `${sign ? `${sign} ` : ''}${symbol} ${value}`;
}

export function parseBrlInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Strip currency prefix and whitespace
  const cleaned = trimmed.replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!cleaned) return null;

  // Reject negative sign or non-numeric garbage
  if (/[^0-9.,]/.test(cleaned)) return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    // Assume Brazilian format 1.234,56 if last separator is comma
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format 1,234.56
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot) {
    // Check if dot is thousands separator like 1.200
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3 && parts.length >= 2) {
      // Ambiguous; treat single dot with 2 decimals as decimal, 3 digits as thousands only if >1 dot
      if (parts.length > 2) {
        normalized = cleaned.replace(/\./g, '');
      }
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return Math.round(parsed * 100) / 100;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  if (monthKey === 'all') return 'Todos os meses';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  const label = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

export interface FinancialSummary {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
  transactionCount: number;
}

export function computeSummary(
  transactions: Transaction[],
  monthKey?: string
): FinancialSummary {
  const scoped =
    monthKey && monthKey !== 'all'
      ? transactions.filter((t) => getMonthKey(t.date) === monthKey)
      : transactions;

  let income = 0;
  let expenses = 0;

  for (const tx of scoped) {
    if (tx.type === 'income') {
      income += tx.amount;
    } else {
      expenses += tx.amount;
    }
  }

  const balance = Math.round((income - expenses) * 100) / 100;
  income = Math.round(income * 100) / 100;
  expenses = Math.round(expenses * 100) / 100;

  const savingsRate =
    income > 0 ? Math.round(((income - expenses) / income) * 1000) / 10 : 0;

  return {
    balance,
    income,
    expenses,
    savingsRate,
    transactionCount: scoped.length,
  };
}

export interface CategoryBreakdownItem {
  meta: CategoryMeta;
  spent: number;
  limit: number;
  remaining: number;
  budgetUsagePct: number;
  expenseSharePct: number;
  status: 'normal' | 'warning' | 'over';
  count: number;
}

export function computeCategoryBreakdown(
  transactions: Transaction[],
  budgets: CategoryBudget[],
  monthKey?: string
): CategoryBreakdownItem[] {
  const scopedExpenses = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      (!monthKey || monthKey === 'all' || getMonthKey(t.date) === monthKey)
  );

  const totalExpenses = scopedExpenses.reduce((acc, t) => acc + t.amount, 0);

  const budgetMap = new Map<CategoryId, number>();
  for (const b of budgets) {
    budgetMap.set(b.category, b.limit);
  }

  const spentMap = new Map<CategoryId, { spent: number; count: number }>();
  for (const cat of CATEGORY_LIST) {
    spentMap.set(cat.id, { spent: 0, count: 0 });
  }

  for (const tx of scopedExpenses) {
    const entry = spentMap.get(tx.category) ?? { spent: 0, count: 0 };
    entry.spent += tx.amount;
    entry.count += 1;
    spentMap.set(tx.category, entry);
  }

  return CATEGORY_LIST.map((meta) => {
    const { spent, count } = spentMap.get(meta.id) ?? { spent: 0, count: 0 };
    const roundedSpent = Math.round(spent * 100) / 100;
    const limit = budgetMap.get(meta.id) ?? 0;
    const remaining = Math.round((limit - roundedSpent) * 100) / 100;
    const budgetUsagePct =
      limit > 0 ? Math.round((roundedSpent / limit) * 1000) / 10 : 0;
    const expenseSharePct =
      totalExpenses > 0
        ? Math.round((roundedSpent / totalExpenses) * 1000) / 10
        : 0;

    let status: 'normal' | 'warning' | 'over' = 'normal';
    if (limit > 0 && roundedSpent > limit) {
      status = 'over';
    } else if (limit > 0 && budgetUsagePct >= 80) {
      status = 'warning';
    }

    return {
      meta,
      spent: roundedSpent,
      limit,
      remaining,
      budgetUsagePct,
      expenseSharePct,
      status,
      count,
    };
  }).sort((a, b) => b.spent - a.spent);
}

export interface CashflowPoint {
  label: string;
  dateKey: string;
  income: number;
  expense: number;
  cumulative: number;
}

export function computeCashflowSeries(
  transactions: Transaction[],
  monthKey: string
): CashflowPoint[] {
  const scoped =
    monthKey === 'all'
      ? transactions
      : transactions.filter((t) => getMonthKey(t.date) === monthKey);

  // Group into 6 five-day buckets across the month (Dias 1-5, 6-10, ..., 26-31)
  // or by date if 'all'
  if (monthKey === 'all') {
    const monthTotals = new Map<string, { income: number; expense: number }>();
    for (const tx of scoped) {
      const m = getMonthKey(tx.date);
      const curr = monthTotals.get(m) ?? { income: 0, expense: 0 };
      if (tx.type === 'income') curr.income += tx.amount;
      else curr.expense += tx.amount;
      monthTotals.set(m, curr);
    }

    const sortedKeys = Array.from(monthTotals.keys()).sort();
    let running = 0;
    return sortedKeys.map((key) => {
      const { income, expense } = monthTotals.get(key)!;
      running += income - expense;
      const [y, m] = key.split('-');
      return {
        label: `${m}/${y.slice(2)}`,
        dateKey: key,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        cumulative: Math.round(running * 100) / 100,
      };
    });
  }

  const buckets = [
    { label: '01–05', min: 1, max: 5, income: 0, expense: 0 },
    { label: '06–10', min: 6, max: 10, income: 0, expense: 0 },
    { label: '11–15', min: 11, max: 15, income: 0, expense: 0 },
    { label: '16–20', min: 16, max: 20, income: 0, expense: 0 },
    { label: '21–25', min: 21, max: 25, income: 0, expense: 0 },
    { label: '26–31', min: 26, max: 31, income: 0, expense: 0 },
  ];

  for (const tx of scoped) {
    const day = Number.parseInt(tx.date.slice(8, 10), 10) || 1;
    const bucket =
      buckets.find((b) => day >= b.min && day <= b.max) ?? buckets[buckets.length - 1];
    if (tx.type === 'income') bucket.income += tx.amount;
    else bucket.expense += tx.amount;
  }

  let running = 0;
  return buckets.map((b) => {
    running += b.income - b.expense;
    return {
      label: b.label,
      dateKey: `${monthKey}-${b.label}`,
      income: Math.round(b.income * 100) / 100,
      expense: Math.round(b.expense * 100) / 100,
      cumulative: Math.round(running * 100) / 100,
    };
  });
}

export interface FinancialInsight {
  tone: 'positive' | 'warning' | 'alert';
  title: string;
  message: string;
  category?: CategoryId;
}

export function computeFinancialInsight(
  transactions: Transaction[],
  budgets: CategoryBudget[],
  monthKey?: string
): FinancialInsight {
  const summary = computeSummary(transactions, monthKey);
  const breakdown = computeCategoryBreakdown(transactions, budgets, monthKey);

  const overBudget = breakdown.find((b) => b.status === 'over');
  if (overBudget) {
    const excess = Math.abs(overBudget.remaining);
    return {
      tone: 'alert',
      category: overBudget.meta.id,
      title: `${overBudget.meta.label} acima do orçamento`,
      message: `Você ultrapassou o teto de ${overBudget.meta.label} em ${formatBrl(excess)}. Reduzir gastos nessa categoria ajuda a preservar sua meta mensal.`,
    };
  }

  const nearLimit = breakdown.find((b) => b.status === 'warning');
  if (nearLimit) {
    return {
      tone: 'warning',
      category: nearLimit.meta.id,
      title: `Atenção ao limite de ${nearLimit.meta.label}`,
      message: `${nearLimit.meta.label} atingiu ${nearLimit.budgetUsagePct.toFixed(0)}% do orçamento (${formatBrl(nearLimit.remaining)} disponíveis até o fim do mês).`,
    };
  }

  if (summary.income > 0 && summary.savingsRate >= 20) {
    return {
      tone: 'positive',
      title: 'Ritmo de economia saudável',
      message: `Você está poupando ${summary.savingsRate.toFixed(1).replace('.', ',')}% das receitas no período (${formatBrl(summary.balance)} líquidos).`,
    };
  }

  const topCategory = breakdown[0];
  if (topCategory && topCategory.spent > 0) {
    return {
      tone: 'positive',
      category: topCategory.meta.id,
      title: 'Orçamentos sob controle',
      message: `Todas as categorias estão dentro do limite. ${CATEGORIES[topCategory.meta.id].label} representa ${topCategory.expenseSharePct.toFixed(0)}% das despesas.`,
    };
  }

  return {
    tone: 'positive',
    title: 'Pronto para começar',
    message: 'Registre suas receitas e despesas para acompanhar o fluxo de caixa e os limites por categoria.',
  };
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  const query = filters.search.trim().toLowerCase();

  return transactions
    .filter((tx) => {
      if (
        filters.monthKey !== 'all' &&
        getMonthKey(tx.date) !== filters.monthKey
      ) {
        return false;
      }
      if (filters.category !== 'all' && tx.category !== filters.category) {
        return false;
      }
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }
      if (query) {
        const catLabel = CATEGORIES[tx.category].label.toLowerCase();
        const matchesDesc = tx.description.toLowerCase().includes(query);
        const matchesMethod = tx.paymentMethod.toLowerCase().includes(query);
        const matchesCat = catLabel.includes(query);
        if (!matchesDesc && !matchesMethod && !matchesCat) return false;
      }
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
