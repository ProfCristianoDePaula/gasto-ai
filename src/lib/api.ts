import type { HealthStatus } from '../types/finance';
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

/**
 * Registra o callback global disparado quando qualquer chamada à API retorna 401.
 * Permite redirecionar o usuário para /login e limpar sessão expirada.
 */
export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorizedHandler = handler;
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Permite omitir o token em rotas públicas como /api/health */
  skipAuth?: boolean;
}

/**
 * Wrapper tipado para requisições à API Hono em /api/*.
 * Injeta automaticamente o Bearer JWT do Supabase e normaliza erros em pt-BR.
 */
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

/**
 * Endpoints tipados do cliente Gastô.
 * Novas rotas de domínio serão adicionadas nas próximas etapas.
 */
export const api = {
  health: () => apiRequest<HealthStatus>('/api/health', { skipAuth: true }),
};
