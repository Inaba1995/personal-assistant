/** Хуки TanStack Query для всех разделов (общие CRUD-обёртки). */
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import type {
  AiAskResponse,
  DashboardSummary,
  Paged,
  SearchResponse,
  Settings,
  User,
  VideoSummaryResponse,
} from '@assistant/shared';
import { ApiError, apiFetch, getAccessToken, setAccessToken } from './client';
import { useToast } from '../lib/toast';

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Неизвестная ошибка';

/* ----------------------------- Auth ----------------------------- */

export function useMe(): UseQueryResult<User, ApiError> {
  const hasToken = Boolean(getAccessToken());
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<User>('/auth/me', { skipRefresh: false }),
    enabled: hasToken,
    staleTime: 60_000,
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      apiFetch<{ user: User; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: data,
        skipRefresh: true,
      }),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(['me'], data.user);
      void qc.invalidateQueries();
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; name: string }) =>
      apiFetch<{ user: User; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: data,
        skipRefresh: true,
      }),
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      qc.setQueryData(['me'], data.user);
      void qc.invalidateQueries();
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST', skipRefresh: true }),
    onSettled: () => {
      setAccessToken(null);
      qc.clear();
    },
  });
}

/* --------------------------- Generic CRUD --------------------------- */

export interface CrudListParams {
  page?: number;
  limit?: number;
  sort?: string;
  [key: string]: string | number | undefined;
}

function toQuery(params?: CrudListParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const str = qs.toString();
  return str ? `?${str}` : '';
}

/** Список с пагинацией: GET /{resource}?page&limit&sort */
export function useCrudList<T>(
  key: string,
  resource: string,
  params?: CrudListParams,
  enabled = true,
): UseQueryResult<Paged<T>, ApiError> {
  return useQuery({
    queryKey: [key, params ?? {}],
    queryFn: () => apiFetch<Paged<T>>(`/${resource}${toQuery(params)}`),
    enabled,
  });
}

/** Все записи без пагинации (для селектов, календарей) — limit=100. */
export function useCrudAll<T>(
  key: string,
  resource: string,
  params?: CrudListParams,
  enabled = true,
): UseQueryResult<Paged<T>, ApiError> {
  return useCrudList<T>(key, resource, { limit: 100, ...params }, enabled);
}

interface CrudMutationsOptions<T> {
  key: string;
  resource: string;
  createMessage?: string;
  updateMessage?: string;
  deleteMessage?: string;
  onSuccessCreate?: (item: T) => void;
  onSuccessUpdate?: (item: T) => void;
}

export function useCrudMutations<TInput, T>(options: CrudMutationsOptions<T>) {
  const qc = useQueryClient();
  const toast = useToast();
  const invalidate = () => void qc.invalidateQueries({ queryKey: [options.key] });

  const create = useMutation({
    mutationFn: (data: TInput) =>
      apiFetch<T>(`/${options.resource}`, { method: 'POST', body: data }),
    onSuccess: (item) => {
      invalidate();
      toast.success(options.createMessage ?? 'Запись создана');
      options.onSuccessCreate?.(item);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TInput> }) =>
      apiFetch<T>(`/${options.resource}/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (item) => {
      invalidate();
      toast.success(options.updateMessage ?? 'Сохранено');
      options.onSuccessUpdate?.(item);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/${options.resource}/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      invalidate();
      toast.success(options.deleteMessage ?? 'Удалено');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  return { create, update, remove };
}

/* --------------------------- Доменные хуки --------------------------- */

export function useDashboard(): UseQueryResult<DashboardSummary, ApiError> {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardSummary>('/dashboard/summary'),
    refetchInterval: 60_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiFetch<Settings>('/settings'),
  });
}

export function useSaveSettings() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (data: Partial<Settings>) =>
      apiFetch<Settings>('/settings', { method: 'PUT', body: data }),
    onSuccess: (settings) => {
      qc.setQueryData(['settings'], settings);
      toast.success('Настройки сохранены');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useAiAsk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { prompt: string; model?: string }) =>
      apiFetch<AiAskResponse>('/ai/ask', { method: 'POST', body: data }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['ai-history'] }),
  });
}

export function useAiHistory() {
  return useQuery({
    queryKey: ['ai-history'],
    queryFn: () => apiFetch<Paged<{ id: string; prompt: string; response: string; model: string; createdAt: string }>>('/ai/history?limit=30'),
  });
}

export function useSearchAnalyze() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { query: string; text: string }) =>
      apiFetch<SearchResponse>('/search', { method: 'POST', body: data }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['search-history'] }),
  });
}

export function useSearchHistory() {
  return useQuery({
    queryKey: ['search-history'],
    queryFn: () =>
      apiFetch<Paged<{ id: string; query: string; summary: string; sources: unknown; createdAt: string }>>(
        '/search/history?limit=20',
      ),
  });
}

export function useVideoSummary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; transcript: string }) =>
      apiFetch<VideoSummaryResponse>('/video/summary', { method: 'POST', body: data }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['video-history'] }),
  });
}

export function useVideoHistory() {
  return useQuery({
    queryKey: ['video-history'],
    queryFn: () =>
      apiFetch<Paged<{ id: string; url: string; summary: string; createdAt: string }>>(
        '/video/history?limit=20',
      ),
  });
}
