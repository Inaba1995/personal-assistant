import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Обёртка для async-роутов: ошибки прокидываются в централизованный errorHandler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}
