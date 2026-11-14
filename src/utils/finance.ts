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

/**
 * Formata um valor inteiro em CENTAVOS para partes óticas de exibição em BRL (R$ 1.234,56).
 * A conversão de centavos para reais ocorre apenas na camada de interface.
 */
export function formatCentsParts(
  cents: number,
  options?: { signed?: boolean; type?: 'income' | 'expense' | 'neutral' }
): BrlParts {
  const safeCents = Number.isFinite(cents) ? Math.round(cents) : 0;
  const absReais = Math.abs(safeCents) / 100;

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absReais);

  let sign: '' | '+' | '-' = '';
  if (options?.type === 'income') {
    sign = '+';
  } else if (options?.type === 'expense') {
    sign = '-';
  } else if (options?.signed) {
    if (safeCents < 0) sign = '-';
    else if (safeCents > 0) sign = '+';
  } else if (safeCents < 0) {
    sign = '-';
  }

  return {
    sign,
    symbol: 'R$',
    value: formatted,
  };
}

export function formatCents(
  cents: number,
  options?: { signed?: boolean; type?: 'income' | 'expense' | 'neutral' }
): string {
  const { sign, symbol, value } = formatCentsParts(cents, options);
  return `${sign ? `${sign} ` : ''}${symbol} ${value}`;
}

/**
 * Converte texto digitado pelo usuário (ex: "1.234,56" ou "145,50") para CENTAVOS inteiros.
 * Retorna null se vazio, zero, negativo ou inválido.
 */
export function parseBrlInputToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!cleaned) return null;

  if (/[^0-9.,]/.test(cleaned)) return null;

  let normalized = cleaned;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  } else if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      normalized = cleaned.replace(/\./g, '');
    }
  }

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  const cents = Math.round(parsed * 100);
  return cents > 0 ? cents : null;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Retorna a chave de mês atual (YYYY-MM) no fuso horário America/Sao_Paulo.
 */
export function getCurrentMonthKey(timeZone = 'America/Sao_Paulo'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
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

/**
 * Formata data ISO YYYY-MM-DD para o padrão brasileiro dd/mm/aaaa.
 */
export function formatDateBr(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export interface FinancialSummary {
  balanceCents: number;
  incomeCents: number;
  expensesCents: number;
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

  let incomeCents = 0;
  let expensesCents = 0;

  for (const tx of scoped) {
    if (tx.type === 'income') {
      incomeCents += tx.amountCents;
    } else {
      expensesCents += tx.amountCents;
    }
  }

  const balanceCents = incomeCents - expensesCents;
  const savingsRate =
    incomeCents > 0
      ? Math.round(((incomeCents - expensesCents) / incomeCents) * 1000) / 10
      : 0;

  return {
    balanceCents,
    incomeCents,
    expensesCents,
    savingsRate,
    transactionCount: scoped.length,
  };
}

export interface CategoryBreakdownItem {
  meta: CategoryMeta;
  spentCents: number;
  limitCents: number;
  remainingCents: number;
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

  const totalExpensesCents = scopedExpenses.reduce(
    (acc, t) => acc + t.amountCents,
    0
  );

  const budgetMap = new Map<CategoryId, number>();
  for (const b of budgets) {
    budgetMap.set(b.category, b.limitCents);
  }

  const spentMap = new Map<CategoryId, { spentCents: number; count: number }>();
  for (const cat of CATEGORY_LIST) {
    spentMap.set(cat.id, { spentCents: 0, count: 0 });
  }

  for (const tx of scopedExpenses) {
    const entry = spentMap.get(tx.category) ?? { spentCents: 0, count: 0 };
    entry.spentCents += tx.amountCents;
    entry.count += 1;
    spentMap.set(tx.category, entry);
  }

  return CATEGORY_LIST.map((meta) => {
    const { spentCents, count } = spentMap.get(meta.id) ?? {
      spentCents: 0,
      count: 0,
    };
    const limitCents = budgetMap.get(meta.id) ?? 0;
    const remainingCents = limitCents - spentCents;
    const budgetUsagePct =
      limitCents > 0 ? Math.round((spentCents / limitCents) * 1000) / 10 : 0;
    const expenseSharePct =
      totalExpensesCents > 0
        ? Math.round((spentCents / totalExpensesCents) * 1000) / 10
        : 0;

    let status: 'normal' | 'warning' | 'over' = 'normal';
    if (limitCents > 0 && spentCents > limitCents) {
      status = 'over';
    } else if (limitCents > 0 && budgetUsagePct >= 80) {
      status = 'warning';
    }

    return {
      meta,
      spentCents,
      limitCents,
      remainingCents,
      budgetUsagePct,
      expenseSharePct,
      status,
      count,
    };
  }).sort((a, b) => b.spentCents - a.spentCents);
}

export interface CashflowPoint {
  label: string;
  dateKey: string;
  incomeCents: number;
  expenseCents: number;
  cumulativeCents: number;
}

export function computeCashflowSeries(
  transactions: Transaction[],
  monthKey: string
): CashflowPoint[] {
  const scoped =
    monthKey === 'all'
      ? transactions
      : transactions.filter((t) => getMonthKey(t.date) === monthKey);

  if (monthKey === 'all') {
    const monthTotals = new Map<
      string,
      { incomeCents: number; expenseCents: number }
    >();
    for (const tx of scoped) {
      const m = getMonthKey(tx.date);
      const curr = monthTotals.get(m) ?? { incomeCents: 0, expenseCents: 0 };
      if (tx.type === 'income') curr.incomeCents += tx.amountCents;
      else curr.expenseCents += tx.amountCents;
      monthTotals.set(m, curr);
    }

    const sortedKeys = Array.from(monthTotals.keys()).sort();
    let runningCents = 0;
    return sortedKeys.map((key) => {
      const { incomeCents, expenseCents } = monthTotals.get(key)!;
      runningCents += incomeCents - expenseCents;
      const [y, m] = key.split('-');
      return {
        label: `${m}/${y.slice(2)}`,
        dateKey: key,
        incomeCents,
        expenseCents,
        cumulativeCents: runningCents,
      };
    });
  }

  const buckets = [
    { label: '01–05', min: 1, max: 5, incomeCents: 0, expenseCents: 0 },
    { label: '06–10', min: 6, max: 10, incomeCents: 0, expenseCents: 0 },
    { label: '11–15', min: 11, max: 15, incomeCents: 0, expenseCents: 0 },
    { label: '16–20', min: 16, max: 20, incomeCents: 0, expenseCents: 0 },
    { label: '21–25', min: 21, max: 25, incomeCents: 0, expenseCents: 0 },
    { label: '26–31', min: 26, max: 31, incomeCents: 0, expenseCents: 0 },
  ];

  for (const tx of scoped) {
    const day = Number.parseInt(tx.date.slice(8, 10), 10) || 1;
    const bucket =
      buckets.find((b) => day >= b.min && day <= b.max) ??
      buckets[buckets.length - 1];
    if (tx.type === 'income') bucket.incomeCents += tx.amountCents;
    else bucket.expenseCents += tx.amountCents;
  }

  let runningCents = 0;
  return buckets.map((b) => {
    runningCents += b.incomeCents - b.expenseCents;
    return {
      label: b.label,
      dateKey: `${monthKey}-${b.label}`,
      incomeCents: b.incomeCents,
      expenseCents: b.expenseCents,
      cumulativeCents: runningCents,
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
): FinancialInsight | null {
  if (transactions.length === 0) return null;

  const summary = computeSummary(transactions, monthKey);
  const breakdown = computeCategoryBreakdown(transactions, budgets, monthKey);

  const overBudget = breakdown.find((b) => b.status === 'over');
  if (overBudget) {
    const excessCents = Math.abs(overBudget.remainingCents);
    return {
      tone: 'alert',
      category: overBudget.meta.id,
      title: `${overBudget.meta.label} acima do orçamento`,
      message: `Você ultrapassou o teto de ${overBudget.meta.label} em ${formatCents(excessCents)}.`,
    };
  }

  const nearLimit = breakdown.find((b) => b.status === 'warning');
  if (nearLimit) {
    return {
      tone: 'warning',
      category: nearLimit.meta.id,
      title: `Atenção ao limite de ${nearLimit.meta.label}`,
      message: `${nearLimit.meta.label} atingiu ${nearLimit.budgetUsagePct.toFixed(0)}% do orçamento (${formatCents(nearLimit.remainingCents)} disponíveis).`,
    };
  }

  if (summary.incomeCents > 0 && summary.savingsRate >= 20) {
    return {
      tone: 'positive',
      title: 'Ritmo de economia saudável',
      message: `Você está poupando ${summary.savingsRate.toFixed(1).replace('.', ',')}% das receitas no período (${formatCents(summary.balanceCents)} líquidos).`,
    };
  }

  const topCategory = breakdown[0];
  if (topCategory && topCategory.spentCents > 0) {
    return {
      tone: 'positive',
      category: topCategory.meta.id,
      title: 'Orçamentos sob controle',
      message: `Todas as categorias estão dentro do limite. ${CATEGORIES[topCategory.meta.id].label} representa ${topCategory.expenseSharePct.toFixed(0)}% das despesas.`,
    };
  }

  return null;
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
