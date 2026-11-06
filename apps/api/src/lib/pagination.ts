/** Пагинация ?page&limit и сортировка ?sort=field | ?sort=-field (минус — по убыванию). */

export interface ListParams {
  page: number;
  limit: number;
  orderBy: Record<string, 'asc' | 'desc'>;
}

/**
 * @param query    query-параметры запроса
 * @param sortWhitelist допустимые поля сортировки
 * @param defaultSort   сортировка по умолчанию, напр. '-createdAt'
 */
export function parseListParams(
  query: Record<string, unknown>,
  sortWhitelist: readonly string[],
  defaultSort: string,
): ListParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(Math.floor(rawLimit), 100) : 20;

  const rawSort = typeof query.sort === 'string' ? query.sort : defaultSort;
  const desc = rawSort.startsWith('-');
  const field = desc ? rawSort.slice(1) : rawSort;
  const safeField = sortWhitelist.includes(field) ? field : defaultSort.replace(/^-/, '');

  return { page, limit, orderBy: { [safeField]: desc ? 'desc' : 'asc' } };
}

/**
 * Равенство-фильтры из query для белого списка полей (?status=TODO&priority=HIGH).
 * Возвращает where-объект без userId (userId добавляется вызывающим кодом).
 */
export function parseFilters(
  query: Record<string, unknown>,
  filterWhitelist: readonly string[],
): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const field of filterWhitelist) {
    const value = query[field];
    if (typeof value === 'string' && value.length > 0) {
      filters[field] = value;
    }
  }
  return filters;
}
