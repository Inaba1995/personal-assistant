/** Централизованные ошибки приложения. Формат ответа: { error: { code, message } }. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static unauthorized(message = 'Требуется авторизация'): AppError {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Недостаточно прав'): AppError {
    return new AppError('FORBIDDEN', message, 403);
  }

  static notFound(message = 'Запись не найдена'): AppError {
    return new AppError('NOT_FOUND', message, 404);
  }

  static validation(message: string): AppError {
    return new AppError('VALIDATION_ERROR', message, 400);
  }
}
