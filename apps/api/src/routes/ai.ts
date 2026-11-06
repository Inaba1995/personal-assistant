import { Router, type Request, type Response } from 'express';
import type { AiAskResponse } from '@assistant/shared';
import { aiAskSchema } from '@assistant/shared';
import { aiService } from '../lib/aiService';
import { asyncHandler } from '../lib/asyncHandler';
import { aiLimiter } from '../lib/rateLimit';
import { parseInput } from '../lib/validate';
import { getOrCreateSettings } from '../lib/settings';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const aiRouter = Router();

/* POST /ai/ask — запрос к OpenAI (заглушка при отсутствии ключа). */
aiRouter.post(
  '/ask',
  aiLimiter,
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(aiAskSchema, req.body);
    const settings = await getOrCreateSettings(req.userId!);
    const model = input.model ?? settings.aiModel;

    const result = await aiService.ask({
      userId: req.userId!,
      prompt: input.prompt,
      model,
      sources: input.sources,
    });

    if (result.fallback) {
      const body: AiAskResponse = { fallback: true, message: result.message, model };
      res.status(200).json(body);
      return;
    }

    const body: AiAskResponse = {
      fallback: false,
      id: result.id,
      response: result.response,
      model: result.model,
      tokensUsed: result.tokensUsed,
      createdAt: new Date().toISOString(),
    };
    res.status(200).json(body);
  }),
);

/* GET /ai/history — история запросов текущего пользователя. */
aiRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = { userId: req.userId! };
    const [items, total] = await Promise.all([
      prisma.aiRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.aiRequest.count({ where }),
    ]);
    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }),
);
