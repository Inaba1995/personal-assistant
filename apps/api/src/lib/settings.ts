import type { Settings } from '@assistant/shared';
import { AI_MODELS } from '@assistant/shared';
import type { Settings as SettingsRow } from '@prisma/client';
import { prisma } from '../prisma';

/** Настройки в формате DTO (даты → ISO, aiModel → валидный enum). */
export function toSettingsDto(row: SettingsRow): Settings {
  const aiModel = (AI_MODELS as readonly string[]).includes(row.aiModel)
    ? (row.aiModel as Settings['aiModel'])
    : 'gpt-4o-mini';
  return {
    id: row.id,
    userId: row.userId,
    workHoursStart: row.workHoursStart,
    workHoursEnd: row.workHoursEnd,
    timezone: row.timezone,
    aiModel,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Настройки пользователя: возвращают существующие или создают дефолтные. */
export async function getOrCreateSettings(userId: string): Promise<Settings> {
  const existing = await prisma.settings.findUnique({ where: { userId } });
  if (existing) return toSettingsDto(existing);
  return toSettingsDto(await prisma.settings.create({ data: { userId } }));
}
