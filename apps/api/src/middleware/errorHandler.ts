import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors';
import { logger } from '../logger';
import { zodErrorMessage } from '../lib/validate';

interface PrismaLikeError {
  code?: string;
  meta?: unknown;
}

function isPrismaError(err: unknown): err is PrismaLikeError {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/** Централизованная обработка ошибок: единый формат { error: { code, message } }. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: zodErrorMessage(err) },
    });
    return;
  }

  if (isPrismaError(err)) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Запись с такими данными уже существует' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Запись не найдена' } });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Ссылка на несуществующую запись' },
      });
      return;
    }
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' },
  });
}

/** 404 для неизвестных API-путей. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Маршрут ${req.method} ${req.path} не найден` },
  });
}
