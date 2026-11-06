import rateLimit from 'express-rate-limit';

const limited = (message: string) => ({
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message } },
});

/** Ограничения на аутентификацию: 60 запросов за 15 минут. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  ...limited('Слишком много запросов к авторизации, попробуйте позже'),
});

/** Ограничения на ИИ-запросы: 20 запросов в минуту. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  ...limited('Слишком много ИИ-запросов, подождите минуту'),
});
