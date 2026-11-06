import type { ZodTypeAny, z } from 'zod';
import { ZodError } from 'zod';
import { AppError } from '../errors';

/** Преобразует ошибки zod в единое сообщение для клиента. */
export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0];
  if (!first) return 'Ошибка валидации';
  const path = first.path.length > 0 ? `${first.path.join('.')}: ` : '';
  return `${path}${first.message}`;
}

/**
 * Валидация входных данных; возвращает Output-тип схемы (значения по умолчанию применены).
 * При ошибке — AppError 400 с единым форматом { error: { code, message } }.
 */
export function parseInput<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.validation(zodErrorMessage(result.error));
  }
  return result.data as z.output<S>;
}
