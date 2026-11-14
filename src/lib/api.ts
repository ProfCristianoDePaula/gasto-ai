import type {
  ApiExpense,
  BudgetsResponse,
  CreateCategoryPayload,
  CreateExpensePayload,
  DashboardResponse,
  DbBudget,
  DbCategory,
  DeleteMyDataResponse,
  HealthStatus,
  MeResponse,
  PaginatedExpensesResponse,
  UpdateCategoryPayload,
  UpdateExpensePayload,
} from '../types/finance';
import { getSupabaseAccessToken } from './supabase';

/**
 * Erro tipado retornado pelo cliente de API do Gastô.
 */
export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorizedHandler: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedHandler = handler;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipAuth = false, headers: customHeaders, ...rest } = options;

  const headers = new Headers(customHeaders);
  headers.set('Accept', 'application/json');

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  if (body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = await getSupabaseAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor do Gastô. Verifique sua conexão.'
    );
  }

  let payload: unknown = null;
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (response.status === 401) {
    onUnauthorizedHandler?.();
    const message =
      isApiErrorPayload(payload) && payload.message
        ? payload.message
        : 'Sua sessão expirou. Faça login novamente.';
    throw new ApiClientError(401, 'UNAUTHORIZED', message);
  }

  if (!response.ok) {
    const code = isApiErrorPayload(payload) ? payload.error : 'API_ERROR';
    const message =
      isApiErrorPayload(payload) && payload.message
        ? payload.message
        : 'Não foi possível concluir a operação. Tente novamente.';
    throw new ApiClientError(response.status, code, message);
  }

  return payload as T;
}

function isApiErrorPayload(
  data: unknown
): data is { error: string; message: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'message' in data &&
    typeof (data as { message: unknown }).message === 'string'
  );
}

export interface ExpensesQueryInput {
  month?: string;
  from?: string;
  to?: string;
  category?: string;
  q?: string;
  min?: number;
  max?: number;
  cursor?: string;
  limit?: number;
}

function buildExpensesQueryString(input: ExpensesQueryInput): string {
  const params = new URLSearchParams();
  if (input.month && input.month !== 'all') params.set('month', input.month);
  if (input.from) params.set('from', input.from);
  if (input.to) params.set('to', input.to);
  if (input.category && input.category !== 'all') {
    params.set('category', input.category);
  }
  if (input.q && input.q.trim()) params.set('q', input.q.trim());
  if (input.min !== undefined) params.set('min', String(input.min));
  if (input.max !== undefined) params.set('max', String(input.max));
  if (input.cursor) params.set('cursor', input.cursor);
  if (input.limit !== undefined) params.set('limit', String(input.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Endpoints tipados do cliente Gastô.
 */
export const api = {
  health: () => apiRequest<HealthStatus>('/api/health', { skipAuth: true }),
  me: () => apiRequest<MeResponse>('/api/me'),
  deleteMyData: (confirmation: string) =>
    apiRequest<DeleteMyDataResponse>('/api/me/data', {
      method: 'DELETE',
      body: { confirmation },
    }),

  dashboard: {
    get: (month: string) =>
      apiRequest<DashboardResponse>(
        `/api/dashboard?month=${encodeURIComponent(month)}`
      ),
  },

  expenses: {
    list: (query: ExpensesQueryInput = {}) =>
      apiRequest<PaginatedExpensesResponse>(
        `/api/expenses${buildExpensesQueryString(query)}`
      ),
    create: (payload: CreateExpensePayload) =>
      apiRequest<{ expense: ApiExpense }>('/api/expenses', {
        method: 'POST',
        body: payload,
      }),
    update: (id: string, payload: UpdateExpensePayload) =>
      apiRequest<{ expense: ApiExpense }>(
        `/api/expenses/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: payload,
        }
      ),
    remove: (id: string) =>
      apiRequest<{ ok: boolean; id: string }>(
        `/api/expenses/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      ),
    exportCsv: async (query: ExpensesQueryInput = {}): Promise<Blob> => {
      const token = await getSupabaseAccessToken();
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const res = await fetch(
        `/api/expenses/export.csv${buildExpensesQueryString(query)}`,
        { headers }
      );

      if (res.status === 401) {
        onUnauthorizedHandler?.();
        throw new ApiClientError(
          401,
          'UNAUTHORIZED',
          'Sua sessão expirou. Faça login novamente.'
        );
      }

      if (!res.ok) {
        throw new ApiClientError(
          res.status,
          'EXPORT_ERROR',
          'Não foi possível exportar o CSV agora.'
        );
      }

      return res.blob();
    },
  },

  categories: {
    list: () => apiRequest<{ categories: DbCategory[] }>('/api/categories'),
    create: (payload: CreateCategoryPayload) =>
      apiRequest<{ category: DbCategory }>('/api/categories', {
        method: 'POST',
        body: payload,
      }),
    update: (id: string, payload: UpdateCategoryPayload) =>
      apiRequest<{ category: DbCategory }>(
        `/api/categories/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: payload,
        }
      ),
    remove: (id: string) =>
      apiRequest<{ ok: boolean; id: string }>(
        `/api/categories/${encodeURIComponent(id)}`,
        {
          method: 'DELETE',
        }
      ),
  },

  budgets: {
    list: () => apiRequest<BudgetsResponse>('/api/budgets'),
    upsert: (categoryId: string | null, amountCents: number) =>
      apiRequest<{ ok: boolean; removed: boolean; budget?: DbBudget }>(
        '/api/budgets',
        {
          method: 'PUT',
          body: { categoryId, amountCents },
        }
      ),
  },
};
