/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Обоснование any: фабрика работает с произвольными моделями Prisma и произвольными
 * zod-схемами. Делегаты Prisma типизированы через generic-массивы, выразить их без
 * any/unknown-кастов невозможно; строгость сохраняется в самих схемах (zod) и в
 * вызывающих модулях (routes передают конкретные схемы и белые списки полей).
 */
import { Router, type Request, type Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../errors';
import { asyncHandler } from './asyncHandler';
import { parseFilters, parseListParams } from './pagination';
import { parseInput } from './validate';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

interface PrismaDelegate {
  findMany(args: any): Promise<any[]>;
  findFirst(args: any): Promise<any | null>;
  create(args: any): Promise<any>;
  update(args: any): Promise<any>;
  deleteMany(args: any): Promise<{ count: number }>;
  count(args: any): Promise<number>;
}

export interface CrudRouterOptions {
  /** Имя модели Prisma (prisma[model]), напр. 'task'. */
  model: string;
  createSchema: ZodType<any>;
  updateSchema: ZodType<any>;
  /** Белый список полей для ?sort=. */
  sortFields: readonly string[];
  /** Сортировка по умолчанию, '-createdAt'. */
  defaultSort: string;
  /** Белый список полей для ?field=value фильтров. */
  filterFields?: readonly string[];
}

function getDelegate(model: string): PrismaDelegate {
  const delegate = (prisma as unknown as Record<string, PrismaDelegate>)[model];
  if (!delegate) {
    throw new AppError('INTERNAL_ERROR', `Модель ${model} не найдена`, 500);
  }
  return delegate;
}

/**
 * Универсальный CRUD-роутер:
 *  GET    /           — список (?page&limit&sort&фильтры), только записи текущего пользователя
 *  GET    /:id        — одна запись (чужая → 404)
 *  POST   /           — создание
 *  PATCH  /:id, PUT /:id — обновление
 *  DELETE /:id        — удаление
 */
export function createCrudRouter(options: CrudRouterOptions): Router {
  const router = Router();
  const filterFields = options.filterFields ?? [];

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const delegate = getDelegate(options.model);
      const { page, limit, orderBy } = parseListParams(
        req.query as Record<string, unknown>,
        options.sortFields,
        options.defaultSort,
      );
      const where = {
        ...parseFilters(req.query as Record<string, unknown>, filterFields),
        userId: req.userId,
      };
      const [items, total] = await Promise.all([
        delegate.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy }),
        delegate.count({ where }),
      ]);
      res.json({
        items,
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }),
  );

  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const delegate = getDelegate(options.model);
      const item = await delegate.findFirst({ where: { id: req.params.id, userId: req.userId } });
      if (!item) throw AppError.notFound();
      res.json(item);
    }),
  );

  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const delegate = getDelegate(options.model);
      const data = parseInput(options.createSchema, req.body);
      const item = await delegate.create({ data: { ...data, userId: req.userId } });
      res.status(201).json(item);
    }),
  );

  const updateHandler = asyncHandler(async (req: Request, res: Response) => {
    const delegate = getDelegate(options.model);
    const data = parseInput(options.updateSchema, req.body);
    const existing = await delegate.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw AppError.notFound();
    // Пустой объект данных валиден (no-op), но Prisma его отвергает — возвращаем запись.
    if (Object.keys(data).length === 0) {
      res.json(existing);
      return;
    }
    const item = await delegate.update({ where: { id: req.params.id }, data });
    res.json(item);
  });

  router.patch('/:id', requireAuth, updateHandler);
  router.put('/:id', requireAuth, updateHandler);

  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const delegate = getDelegate(options.model);
      const { count } = await delegate.deleteMany({
        where: { id: req.params.id, userId: req.userId },
      });
      if (count === 0) throw AppError.notFound();
      res.status(204).end();
    }),
  );

  return router;
}
