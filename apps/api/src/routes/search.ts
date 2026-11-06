import { Router, type Request, type Response } from 'express';
import type { SearchResponse, SearchSource } from '@assistant/shared';
import { searchCreateSchema } from '@assistant/shared';
import { aiService } from '../lib/aiService';
import { asyncHandler } from '../lib/asyncHandler';
import { asJson, serialize } from '../lib/json';
import { parseInput } from '../lib/validate';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const searchRouter = Router();

/** Извлекает ссылки из вставленного пользователем текста (без скрейпинга). */
export function extractSources(text: string): SearchSource[] {
  const matches = text.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [];
  const seen = new Set<string>();
  const sources: SearchSource[] = [];
  for (const url of matches) {
    const clean = url.replace(/[.,;:]+$/, '');
    if (seen.has(clean)) continue;
    seen.add(clean);
    let title = clean;
    try {
      const parsed = new URL(clean);
      title = `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    } catch {
      // оставляем URL как заголовок
    }
    sources.push({ title, url: clean });
  }
  return sources;
}

/* POST /search — ручной анализ текста/ссылок, выжимка через ИИ. */
searchRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(searchCreateSchema, req.body);
    const sources = extractSources(input.text);
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId! } });
    const model = settings?.aiModel ?? 'gpt-4o-mini';

    const prompt = `Запрос: ${input.query}\n\nТекст для анализа:\n${input.text}`;
    const result = await aiService.ask({
      userId: req.userId!,
      prompt,
      model,
      sources,
      systemHint:
        'Составь краткую выжимку по запросу пользователя из переданного текста: сначала один абстракт-вывод, затем 3–5 пунктов ключевого. Если в тексте есть ссылки — перечисли их в конце как источники.',
    });

    if (result.fallback) {
      const body: SearchResponse = {
        id: '',
        query: input.query,
        summary: '',
        sources,
        fallback: true,
        message: result.message,
        createdAt: new Date().toISOString(),
      };
      res.status(200).json(body);
      return;
    }

    const saved = await prisma.searchResult.create({
      data: {
        userId: req.userId!,
        query: input.query,
        summary: result.response,
        sources: asJson(sources),
      },
    });

    const body: SearchResponse = {
      id: saved.id,
      query: saved.query,
      summary: saved.summary,
      sources: serialize<SearchResponse['sources']>(saved.sources),
      fallback: false,
      createdAt: saved.createdAt.toISOString(),
    };
    res.status(200).json(body);
  }),
);

/* GET /search/history */
searchRouter.get(
  '/history',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const where = { userId: req.userId! };
    const [items, total] = await Promise.all([
      prisma.searchResult.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.searchResult.count({ where }),
    ]);
    res.json({ items, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  }),
);
