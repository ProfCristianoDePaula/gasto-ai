import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { api, type ExpensesQueryInput } from '../lib/api';
import type {
  ApiExpense,
  BudgetsResponse,
  CreateCategoryPayload,
  CreateExpensePayload,
  DashboardResponse,
  DbCategory,
  PaginatedExpensesResponse,
  UpdateCategoryPayload,
  UpdateExpensePayload,
} from '../types/finance';

export const financeKeys = {
  me: (userId?: string) => ['me', userId] as const,
  categories: (userId?: string) => ['categories', userId] as const,
  budgets: (userId?: string) => ['budgets', userId] as const,
  dashboard: (userId: string | undefined, month: string) =>
    ['dashboard', userId, month] as const,
  expenses: (userId: string | undefined, filters: ExpensesQueryInput) =>
    ['expenses', userId, filters] as const,
};

export function useCategoriesQuery() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: financeKeys.categories(userId),
    queryFn: async () => {
      const res = await api.categories.list();
      return res.categories;
    },
    enabled: Boolean(session),
  });
}

export function useDashboardQuery(month: string) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: financeKeys.dashboard(userId, month),
    queryFn: () => api.dashboard.get(month),
    enabled: Boolean(session),
  });
}

export function useBudgetsQuery() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: financeKeys.budgets(userId),
    queryFn: () => api.budgets.list(),
    enabled: Boolean(session),
  });
}

export function useExpensesInfiniteQuery(filters: ExpensesQueryInput) {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useInfiniteQuery({
    queryKey: financeKeys.expenses(userId, filters),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.expenses.list({
        ...filters,
        cursor: pageParam,
        limit: filters.limit ?? 20,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(session),
  });
}

function matchesExpenseFilters(
  expense: ApiExpense,
  filters: ExpensesQueryInput
): boolean {
  if (filters.month && filters.month !== 'all') {
    if (!expense.expense_date.startsWith(filters.month)) return false;
  }
  if (filters.from && expense.expense_date < filters.from) return false;
  if (filters.to && expense.expense_date > filters.to) return false;
  if (
    filters.category &&
    filters.category !== 'all' &&
    expense.category_id !== filters.category
  ) {
    return false;
  }
  if (filters.min !== undefined && expense.amount_cents < filters.min) {
    return false;
  }
  if (filters.max !== undefined && expense.amount_cents > filters.max) {
    return false;
  }
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    const text =
      `${expense.merchant ?? ''} ${expense.notes ?? ''} ${expense.category_name ?? ''}`.toLowerCase();
    if (!text.includes(q)) return false;
  }
  return true;
}

function applyOptimisticExpenseToDashboard(
  dash: DashboardResponse,
  expense: ApiExpense,
  deltaSign: 1 | -1
): DashboardResponse {
  const monthPrefix = `${dash.month}-`;
  const isInMonth = expense.expense_date.startsWith(monthPrefix);

  const nextAllTime = Math.max(0, dash.totalExpensesAllTime + deltaSign);
  if (!isInMonth) {
    return {
      ...dash,
      totalExpensesAllTime: nextAllTime,
    };
  }

  const deltaCents = expense.amount_cents * deltaSign;
  const nextTotalCents = Math.max(0, dash.totalCents + deltaCents);
  const nextCount = Math.max(0, dash.expenseCount + deltaSign);

  const nextDaily = dash.dailySeries.map((pt) =>
    pt.date === expense.expense_date
      ? {
          ...pt,
          totalCents: Math.max(0, pt.totalCents + deltaCents),
          expenseCount: Math.max(0, pt.expenseCount + deltaSign),
        }
      : pt
  );

  const nextCategories = dash.categories.map((cat) => {
    if (cat.categoryId !== expense.category_id) {
      const sharePct =
        nextTotalCents > 0
          ? Math.round((cat.spentCents / nextTotalCents) * 1000) / 10
          : 0;
      return { ...cat, sharePct };
    }
    const spentCents = Math.max(0, cat.spentCents + deltaCents);
    const expenseCount = Math.max(0, cat.expenseCount + deltaSign);
    const sharePct =
      nextTotalCents > 0
        ? Math.round((spentCents / nextTotalCents) * 1000) / 10
        : 0;
    const budgetUsagePct =
      cat.budgetCents > 0
        ? Math.round((spentCents / cat.budgetCents) * 1000) / 10
        : 0;
    const remainingCents = cat.budgetCents - spentCents;
    let status = cat.status;
    if (cat.budgetCents > 0) {
      status =
        spentCents > cat.budgetCents
          ? 'over'
          : budgetUsagePct >= 80
            ? 'warning'
            : 'normal';
    }
    return {
      ...cat,
      spentCents,
      expenseCount,
      sharePct,
      remainingCents,
      budgetUsagePct,
      status,
    };
  });

  const nextRecent =
    deltaSign === 1
      ? [expense, ...dash.recentExpenses]
          .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
          .slice(0, 10)
      : dash.recentExpenses.filter((e) => e.id !== expense.id);

  const limit = dash.budgetStatus.totalLimitCents;
  const usagePct =
    limit > 0 ? Math.round((nextTotalCents / limit) * 1000) / 10 : 0;
  let budgetState = dash.budgetStatus.status;
  if (limit > 0) {
    budgetState =
      nextTotalCents > limit
        ? 'over'
        : usagePct >= 80
          ? 'warning'
          : 'normal';
  }

  return {
    ...dash,
    totalCents: nextTotalCents,
    expenseCount: nextCount,
    totalExpensesAllTime: nextAllTime,
    dailySeries: nextDaily,
    categories: nextCategories,
    recentExpenses: nextRecent,
    budgetStatus: {
      ...dash.budgetStatus,
      spentCents: nextTotalCents,
      remainingCents: limit - nextTotalCents,
      usagePct,
      status: budgetState,
    },
  };
}

/**
 * Criação de despesa com atualização otimista no TanStack Query (lista + dashboard).
 */
export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (payload: CreateExpensePayload) => api.expenses.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', userId] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });

      const previousExpenses = queryClient.getQueriesData<
        InfiniteData<PaginatedExpensesResponse>
      >({ queryKey: ['expenses', userId] });
      const previousDashboards = queryClient.getQueriesData<DashboardResponse>({
        queryKey: ['dashboard', userId],
      });

      const categories =
        queryClient.getQueryData<DbCategory[]>(financeKeys.categories(userId)) ??
        [];
      const matchedCategory = categories.find(
        (c) => c.id === payload.categoryId
      );

      const nowIso = new Date().toISOString();
      const optimisticExpense: ApiExpense = {
        id: `optimistic-${crypto.randomUUID()}`,
        user_id: userId ?? '',
        amount_cents: payload.amountCents,
        expense_date: payload.expenseDate,
        merchant: payload.merchant,
        category_id: payload.categoryId,
        notes: payload.notes ?? null,
        source: payload.source ?? 'manual',
        image_key: null,
        thumbnail: null,
        ai_confidence: null,
        ai_raw: null,
        content_hash: null,
        created_at: nowIso,
        updated_at: nowIso,
        category_name: matchedCategory?.name ?? null,
        category_icon: matchedCategory?.icon ?? 'layers',
        category_color: matchedCategory?.color ?? '#64748B',
      };

      for (const [queryKey, data] of previousExpenses) {
        if (!data || data.pages.length === 0) continue;
        const filters = (queryKey[2] ?? {}) as ExpensesQueryInput;
        if (!matchesExpenseFilters(optimisticExpense, filters)) continue;

        const firstPage = data.pages[0]!;
        const updatedFirst: PaginatedExpensesResponse = {
          ...firstPage,
          items: [optimisticExpense, ...firstPage.items].sort((a, b) =>
            b.expense_date.localeCompare(a.expense_date)
          ),
          totalCount: firstPage.totalCount + 1,
          totalCents: firstPage.totalCents + optimisticExpense.amount_cents,
        };

        queryClient.setQueryData<InfiniteData<PaginatedExpensesResponse>>(
          queryKey,
          {
            ...data,
            pages: [updatedFirst, ...data.pages.slice(1)],
          }
        );
      }

      for (const [queryKey, dash] of previousDashboards) {
        if (!dash) continue;
        queryClient.setQueryData<DashboardResponse>(
          queryKey,
          applyOptimisticExpenseToDashboard(dash, optimisticExpense, 1)
        );
      }

      return { previousExpenses, previousDashboards };
    },
    onError: (_err, _payload, context) => {
      if (!context) return;
      for (const [key, data] of context.previousExpenses) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, dash] of context.previousDashboards) {
        queryClient.setQueryData(key, dash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}

export function useUpdateExpenseMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateExpensePayload }) =>
      api.expenses.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', userId] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });

      const previousExpenses = queryClient.getQueriesData<
        InfiniteData<PaginatedExpensesResponse>
      >({ queryKey: ['expenses', userId] });
      const previousDashboards = queryClient.getQueriesData<DashboardResponse>({
        queryKey: ['dashboard', userId],
      });

      const categories =
        queryClient.getQueryData<DbCategory[]>(financeKeys.categories(userId)) ??
        [];
      const matchedCategory = payload.categoryId
        ? categories.find((c) => c.id === payload.categoryId)
        : undefined;

      for (const [queryKey, data] of previousExpenses) {
        if (!data) continue;
        queryClient.setQueryData<InfiniteData<PaginatedExpensesResponse>>(
          queryKey,
          {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      amount_cents: payload.amountCents ?? item.amount_cents,
                      expense_date: payload.expenseDate ?? item.expense_date,
                      merchant:
                        payload.merchant !== undefined
                          ? payload.merchant
                          : item.merchant,
                      category_id:
                        payload.categoryId !== undefined
                          ? payload.categoryId
                          : item.category_id,
                      notes:
                        payload.notes !== undefined ? payload.notes : item.notes,
                      category_name:
                        matchedCategory?.name ?? item.category_name,
                      category_icon:
                        matchedCategory?.icon ?? item.category_icon,
                      category_color:
                        matchedCategory?.color ?? item.category_color,
                    }
                  : item
              ),
            })),
          }
        );
      }

      return { previousExpenses, previousDashboards };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previousExpenses) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, dash] of context.previousDashboards) {
        queryClient.setQueryData(key, dash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}

export function useDeleteExpenseMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (id: string) => api.expenses.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', userId] });
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });

      const previousExpenses = queryClient.getQueriesData<
        InfiniteData<PaginatedExpensesResponse>
      >({ queryKey: ['expenses', userId] });
      const previousDashboards = queryClient.getQueriesData<DashboardResponse>({
        queryKey: ['dashboard', userId],
      });

      let removedItem: ApiExpense | undefined;
      for (const [queryKey, data] of previousExpenses) {
        if (!data) continue;
        for (const page of data.pages) {
          const found = page.items.find((item) => item.id === id);
          if (found) {
            removedItem = found;
            break;
          }
        }
        const removedCents = removedItem?.amount_cents ?? 0;
        const didRemove = data.pages.some((p) =>
          p.items.some((item) => item.id === id)
        );
        queryClient.setQueryData<InfiniteData<PaginatedExpensesResponse>>(
          queryKey,
          {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== id),
              totalCount: didRemove
                ? Math.max(0, page.totalCount - 1)
                : page.totalCount,
              totalCents: didRemove
                ? Math.max(0, page.totalCents - removedCents)
                : page.totalCents,
            })),
          }
        );
      }

      for (const [queryKey, dash] of previousDashboards) {
        if (!dash) continue;
        const target =
          removedItem ?? dash.recentExpenses.find((item) => item.id === id);
        if (target) {
          queryClient.setQueryData<DashboardResponse>(
            queryKey,
            applyOptimisticExpenseToDashboard(dash, target, -1)
          );
        }
      }

      return { previousExpenses, previousDashboards };
    },
    onError: (_err, _id, context) => {
      if (!context) return;
      for (const [key, data] of context.previousExpenses) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, dash] of context.previousDashboards) {
        queryClient.setQueryData(key, dash);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
    },
  });
}

export function useUpsertBudgetMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: ({
      categoryId,
      amountCents,
    }: {
      categoryId: string | null;
      amountCents: number;
    }) => api.budgets.upsert(categoryId, amountCents),
    onMutate: async ({ categoryId, amountCents }) => {
      await queryClient.cancelQueries({ queryKey: ['budgets', userId] });
      const previous = queryClient.getQueryData<BudgetsResponse>(
        financeKeys.budgets(userId)
      );

      if (previous) {
        const filtered = previous.budgets.filter(
          (b) => b.category_id !== categoryId
        );
        const nextBudgets =
          amountCents === 0
            ? filtered
            : [
                ...filtered,
                {
                  id: `optimistic-${categoryId ?? 'total'}`,
                  user_id: userId ?? '',
                  category_id: categoryId,
                  amount_cents: amountCents,
                  created_at: new Date().toISOString(),
                },
              ];

        queryClient.setQueryData<BudgetsResponse>(financeKeys.budgets(userId), {
          ...previous,
          totalBudgetCents:
            categoryId === null
              ? amountCents === 0
                ? null
                : amountCents
              : previous.totalBudgetCents,
          budgets: nextBudgets,
          categoryBudgets: nextBudgets.filter((b) => b.category_id !== null),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(financeKeys.budgets(userId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) =>
      api.categories.create(payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['me', userId] });
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateCategoryPayload;
    }) => api.categories.update(id, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: (id: string) => api.categories.remove(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', userId] });
      queryClient.invalidateQueries({ queryKey: ['budgets', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
      queryClient.invalidateQueries({ queryKey: ['me', userId] });
    },
  });
}
