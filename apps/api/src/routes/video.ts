import { Router, type Request, type Response } from 'express';
import type { VideoSummaryRecord, VideoSummaryResponse, VideoTimestamp } from '@assistant/shared';
import { videoSummarySchema } from '@assistant/shared';
import { aiService } from '../lib/aiService';
import { asyncHandler } from '../lib/asyncHandler';
import { asJson, serialize } from '../lib/json';
import { parseInput } from '../lib/validate';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const videoRouter = Router();

/**
 * Извлекает таймкоды из транскрипта вида «12:34 — текст» / «01:02:15 текст».
 * Если таймкодов нет — вернётся пустой список.
 */
export function extractTimestamps(transcript: string): VideoTimestamp[] {
  const result: VideoTimestamp[] = [];
  const regex = /^\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–—:.]?\s*(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(transcript)) !== null) {
    const time = match[1];
    const note = (match[2] ?? '').trim();
    if (time && note) result.push({ time, note });
    if (result.length >= 100) break;
  }
  return result;
}

/* POST /video/summary — резюме видео по URL/транскрипту + таймкоды. */
videoRouter.post(
  '/summary',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(videoSummarySchema, req.body);
    const timestamps = extractTimestamps(input.transcript);
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId! } });
    const model = settings?.aiModel ?? 'gpt-4o-mini';

    const prompt =
      (input.url ? `URL видео: ${input.url}\n\n` : '') +
      `Транскрипт:\n${input.transcript}`;

    const result = await aiService.ask({
      userId: req.userId!,
      prompt,
      model,
      systemHint:
        'Сделай резюме видео/встречи: 1 абстракт, затем 3–6 пунктов ключевых мыслей, в конце — «Таймкоды», если они есть в транскрипте.',
    });

    if (result.fallback) {
      const body: VideoSummaryResponse = {
        id: '',
        url: input.url,
        summary: '',
        timestamps,
        fallback: true,
        message: result.message,
        createdAt: new Date().toISOString(),
      };
      res.status(200).json(body);
      return;
    }

    const saved = await prisma.videoSummary.create({
      data: {
        userId: req.userId!,
        url: input.url,
        summary: result.response,
        timestamps: asJson(timestamps),
      },
    });

    const body: VideoSummaryResponse = {
      id: saved.id,
      url: saved.url,
      summary: saved.summary,
      timestamps: serialize<VideoSummaryResponse['timestamps']>(saved.timestamps),
      fallback: false,
      createdAt: saved.createdAt.toISOString(),
    };
    res.status(200).json(body);
  }),
);

/* GET /video/history */
videoRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = { userId: req.userId! };
    const [items, total] = await Promise.all([
      prisma.videoSummary.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.videoSummary.count({ where }),
    ]);
    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }),
);

export type { VideoSummaryRecord };
