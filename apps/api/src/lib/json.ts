import type { Prisma } from '@prisma/client';

/**
 * Приведение значения к Json-вводу Prisma (поля типа Json в SQLite).
 * Требуется из-за отсутствия index signature у обычных объектных типов.
 */
export function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

/**
 * Сериализация Prisma-моделей в формат DTO: Date → ISO-строка, Json → plain value.
 * (Express всё равно сериализует ответ через JSON.stringify — здесь делаем это явно.)
 */
export function serialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
