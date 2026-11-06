/**
 * HTTP-клиент: JWT в заголовке, прозрачный refresh access-токена,
 * единый формат ошибок { error: { code, message } }.
 */
import type { ApiErrorBody } from '@assistant/shared';

const ACCESS_KEY = 'pa.accessToken';

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(ACCESS_KEY, token);
    else localStorage.removeItem(ACCESS_KEY);
  } catch {
    // localStorage может быть недоступен — работаем без него.
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken: string };
    setAccessToken(body.accessToken);
    return body.accessToken;
  } catch {
    return null;
  }
}

/** Единственный выполняемый refresh одновременно (single-flight). */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Отключить попытку refresh при 401 (для самих auth-запросов). */
  skipRefresh?: boolean;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { body, skipRefresh, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  if (body !== undefined && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  let res = await fetch(`/api${path}`, {
    ...rest,
    headers: requestHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Прозрачная ротация: 401 → refresh → повтор запроса.
  if (res.status === 401 && token && !skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      requestHeaders.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(`/api${path}`, {
        ...rest,
        headers: requestHeaders,
        credentials: 'include',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } else {
      setAccessToken(null);
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const errorBody = parsed as ApiErrorBody | null;
    if (res.status === 401) setAccessToken(null);
    throw new ApiError(
      res.status,
      errorBody?.error?.code ?? 'UNKNOWN',
      errorBody?.error?.message ?? `Ошибка запроса (${res.status})`,
    );
  }

  return parsed as T;
}

/** Скачивание содержимого как файла (CSV/JSON). */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
