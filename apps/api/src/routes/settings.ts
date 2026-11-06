import { Router, type Request, type Response } from 'express';
import { settingsUpdateSchema } from '@assistant/shared';
import { asyncHandler } from '../lib/asyncHandler';
import { parseInput } from '../lib/validate';
import { getOrCreateSettings, toSettingsDto } from '../lib/settings';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const settingsRouter = Router();

/* GET /settings — текущие настройки (создаются при первом обращении). */
settingsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const settings = await getOrCreateSettings(req.userId!);
    res.json(settings);
  }),
);

/* PUT /settings — обновление настроек. Ключ OpenAI здесь НЕ редактируется. */
settingsRouter.put(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(settingsUpdateSchema, req.body);
    await getOrCreateSettings(req.userId!);
    const settings = await prisma.settings.update({
      where: { userId: req.userId! },
      data: input,
    });
    res.json(toSettingsDto(settings));
  }),
);
