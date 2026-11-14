/**
 * Consultas SQL agregadas no D1 para o Dashboard mensal do Gastô.
 * Toda consulta filtra explicitamente por `user_id` com prepared statements.
 */

import { listBudgets } from './budgets';
import { ensureDefaultCategories } from './categories';
import type { ExpenseWithCategoryRow } from './expenses';

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
  recentExpenses: ExpenseWithCategoryRow[];
  budgetStatus: DashboardBudgetStatus;
}

export function getPreviousMonthKey(month: string): string {
  const [yStr, mStr] = month.split('-');
  const year = Number(yStr);
  const monthNum = Number(mStr);
  if (monthNum === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(monthNum - 1).padStart(2, '0')}`;
}

export function getDaysInMonth(month: string): number {
  const [yStr, mStr] = month.split('-');
  const year = Number(yStr);
  const monthNum = Number(mStr);
  return new Date(year, monthNum, 0).getDate();
}

export async function getDashboardData(
  db: D1Database,
  userId: string,
  month: string
): Promise<DashboardResponse> {
  // Garante as 5 categorias padrão caso seja a primeira consulta
  await ensureDefaultCategories(db, userId);

  const previousMonth = getPreviousMonthKey(month);
  const monthLike = `${month}-%`;
  const prevMonthLike = `${previousMonth}-%`;

  const [
    currTotals,
    prevTotals,
    allTimeTotals,
    dailyAgg,
    categoryAgg,
    uncategorizedAgg,
    budgets,
    recentResult,
  ] = await Promise.all([
    db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents, COUNT(*) AS expense_count
         FROM expenses
         WHERE user_id = ? AND expense_date LIKE ?`
      )
      .bind(userId, monthLike)
      .first<{ total_cents: number; expense_count: number }>(),

    db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS total_cents
         FROM expenses
         WHERE user_id = ? AND expense_date LIKE ?`
      )
      .bind(userId, prevMonthLike)
      .first<{ total_cents: number }>(),

    db
      .prepare(
        `SELECT COUNT(*) AS total_count
         FROM expenses
         WHERE user_id = ?`
      )
      .bind(userId)
      .first<{ total_count: number }>(),

    db
      .prepare(
        `SELECT expense_date, COALESCE(SUM(amount_cents), 0) AS total_cents, COUNT(*) AS expense_count
         FROM expenses
         WHERE user_id = ? AND expense_date LIKE ?
         GROUP BY expense_date
         ORDER BY expense_date ASC`
      )
      .bind(userId, monthLike)
      .all<{
        expense_date: string;
        total_cents: number;
        expense_count: number;
      }>(),

    db
      .prepare(
        `SELECT c.id AS category_id, c.name, c.icon, c.color, c.is_default,
                COALESCE(SUM(e.amount_cents), 0) AS spent_cents,
                COUNT(e.id) AS expense_count
         FROM categories c
         LEFT JOIN expenses e
           ON e.category_id = c.id
          AND e.user_id = c.user_id
          AND e.expense_date LIKE ?
         WHERE c.user_id = ?
         GROUP BY c.id, c.name, c.icon, c.color, c.is_default
         ORDER BY spent_cents DESC, c.is_default DESC, c.name ASC`
      )
      .bind(monthLike, userId)
      .all<{
        category_id: string;
        name: string;
        icon: string;
        color: string;
        is_default: number;
        spent_cents: number;
        expense_count: number;
      }>(),

    db
      .prepare(
        `SELECT COALESCE(SUM(amount_cents), 0) AS spent_cents, COUNT(*) AS expense_count
         FROM expenses
         WHERE user_id = ? AND category_id IS NULL AND expense_date LIKE ?`
      )
      .bind(userId, monthLike)
      .first<{ spent_cents: number; expense_count: number }>(),

    listBudgets(db, userId),

    db
      .prepare(
        `SELECT e.id, e.user_id, e.amount_cents, e.expense_date, e.merchant, e.category_id, e.notes,
                e.source, e.image_key, e.thumbnail, e.ai_confidence, e.ai_raw, e.content_hash,
                e.created_at, e.updated_at,
                c.name AS category_name, c.icon AS category_icon, c.color AS category_color
         FROM expenses e
         LEFT JOIN categories c ON c.id = e.category_id AND c.user_id = e.user_id
         WHERE e.user_id = ? AND e.expense_date LIKE ?
         ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC
         LIMIT 10`
      )
      .bind(userId, monthLike)
      .all<ExpenseWithCategoryRow>(),
  ]);

  const totalCents = Number(currTotals?.total_cents ?? 0);
  const expenseCount = Number(currTotals?.expense_count ?? 0);
  const previousMonthTotalCents = Number(prevTotals?.total_cents ?? 0);
  const totalExpensesAllTime = Number(allTimeTotals?.total_count ?? 0);

  let variationPct: number | null = null;
  if (previousMonthTotalCents > 0) {
    variationPct =
      Math.round(
        ((totalCents - previousMonthTotalCents) / previousMonthTotalCents) *
          1000
      ) / 10;
  } else if (totalCents > 0) {
    variationPct = 100;
  }

  // Série diária completa do mês (01..último dia do mês)
  const dailyMap = new Map<
    string,
    { totalCents: number; expenseCount: number }
  >();
  for (const row of dailyAgg.results) {
    dailyMap.set(row.expense_date, {
      totalCents: Number(row.total_cents),
      expenseCount: Number(row.expense_count),
    });
  }

  const daysInMonth = getDaysInMonth(month);
  const dailySeries: DailySeriesPoint[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const entry = dailyMap.get(date);
    dailySeries.push({
      date,
      day,
      totalCents: entry?.totalCents ?? 0,
      expenseCount: entry?.expenseCount ?? 0,
    });
  }

  // Orçamentos por categoria e orçamento total
  let explicitTotalBudgetCents: number | null = null;
  let sumCategoryBudgetsCents = 0;
  const budgetByCat = new Map<string, number>();

  for (const b of budgets) {
    if (b.category_id === null) {
      explicitTotalBudgetCents = Number(b.amount_cents);
    } else {
      const amount = Number(b.amount_cents);
      budgetByCat.set(b.category_id, amount);
      sumCategoryBudgetsCents += amount;
    }
  }

  const categories: DashboardCategoryItem[] = categoryAgg.results.map((row) => {
    const spentCents = Number(row.spent_cents);
    const budgetCents = budgetByCat.get(row.category_id) ?? 0;
    const sharePct =
      totalCents > 0 ? Math.round((spentCents / totalCents) * 1000) / 10 : 0;
    const remainingCents = budgetCents - spentCents;
    const budgetUsagePct =
      budgetCents > 0
        ? Math.round((spentCents / budgetCents) * 1000) / 10
        : 0;

    let status: DashboardCategoryItem['status'] = 'unset';
    if (budgetCents > 0) {
      if (spentCents > budgetCents) status = 'over';
      else if (budgetUsagePct >= 80) status = 'warning';
      else status = 'normal';
    }

    return {
      categoryId: row.category_id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      isDefault: row.is_default === 1,
      spentCents,
      expenseCount: Number(row.expense_count),
      sharePct,
      budgetCents,
      remainingCents,
      budgetUsagePct,
      status,
    };
  });

  const uncatSpent = Number(uncategorizedAgg?.spent_cents ?? 0);
  const uncatCount = Number(uncategorizedAgg?.expense_count ?? 0);
  if (uncatCount > 0 || uncatSpent > 0) {
    categories.push({
      categoryId: null,
      name: 'Sem categoria',
      icon: 'layers',
      color: '#64748B',
      isDefault: false,
      spentCents: uncatSpent,
      expenseCount: uncatCount,
      sharePct:
        totalCents > 0 ? Math.round((uncatSpent / totalCents) * 1000) / 10 : 0,
      budgetCents: 0,
      remainingCents: -uncatSpent,
      budgetUsagePct: 0,
      status: 'unset',
    });
  }

  const effectiveLimitCents =
    explicitTotalBudgetCents !== null
      ? explicitTotalBudgetCents
      : sumCategoryBudgetsCents;

  const totalUsagePct =
    effectiveLimitCents > 0
      ? Math.round((totalCents / effectiveLimitCents) * 1000) / 10
      : 0;

  let totalStatus: DashboardBudgetStatus['status'] = 'unset';
  if (effectiveLimitCents > 0) {
    if (totalCents > effectiveLimitCents) totalStatus = 'over';
    else if (totalUsagePct >= 80) totalStatus = 'warning';
    else totalStatus = 'normal';
  }

  return {
    month,
    previousMonth,
    totalCents,
    expenseCount,
    previousMonthTotalCents,
    variationPct,
    totalExpensesAllTime,
    dailySeries,
    categories,
    recentExpenses: recentResult.results,
    budgetStatus: {
      totalLimitCents: effectiveLimitCents,
      explicitTotalBudgetCents,
      sumCategoryBudgetsCents,
      spentCents: totalCents,
      remainingCents: effectiveLimitCents - totalCents,
      usagePct: totalUsagePct,
      status: totalStatus,
    },
  };
}
