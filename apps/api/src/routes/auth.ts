import { createHash } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import type { User } from '@assistant/shared';
import { loginSchema, registerSchema } from '@assistant/shared';
import { AppError } from '../errors';
import { asyncHandler } from '../lib/asyncHandler';
import { parseInput } from '../lib/validate';
import { prisma } from '../prisma';
import { config } from '../config';
import {
  comparePassword,
  hashPassword,
  requireAuth,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../middleware/auth';

export const authRouter = Router();

const REFRESH_COOKIE = 'refreshToken';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: User['role'];
  createdAt: Date;
}

const toPublicUser = (user: UserRow): User => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.env === 'production',
    path: '/api/auth',
    maxAge: config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

/** Выпуск пары токенов + сохранение хеша refresh-токена (ротация). */
async function issueTokens(
  userId: string,
  role: User['role'],
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId, `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000),
    },
  });

  return { accessToken, refreshToken };
}

/* POST /auth/register */
authRouter.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(registerSchema, req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError('EMAIL_EXISTS', 'Пользователь с таким email уже существует', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        role: 'USER',
      },
    });
    await prisma.settings.create({ data: { userId: user.id } });

    const tokens = await issueTokens(user.id, user.role);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(201).json({ user: toPublicUser(user), accessToken: tokens.accessToken });
  }),
);

/* POST /auth/login */
authRouter.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseInput(loginSchema, req.body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await comparePassword(input.password, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Неверный email или пароль', 401);
    }

    const tokens = await issueTokens(user.id, user.role);
    setRefreshCookie(res, tokens.refreshToken);
    res.json({ user: toPublicUser(user), accessToken: tokens.accessToken });
  }),
);

/* POST /auth/refresh — ротация: старый токен удаляется, выдаётся новый. */
authRouter.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const token = (req.cookies as Record<string, string | undefined> | undefined)?.refreshToken;
    if (!token) {
      throw new AppError('NO_REFRESH_TOKEN', 'Refresh-токен отсутствует', 401);
    }

    const payload = verifyRefreshToken(token);
    const tokenHash = sha256(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
      clearRefreshCookie(res);
      throw new AppError('INVALID_REFRESH_TOKEN', 'Refresh-токен недействителен', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) {
      clearRefreshCookie(res);
      throw new AppError('INVALID_REFRESH_TOKEN', 'Пользователь не найден', 401);
    }

    // Ротация: старый токен инвалидируем, выпускаем новый.
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await issueTokens(user.id, user.role);
    setRefreshCookie(res, tokens.refreshToken);

    res.json({ accessToken: tokens.accessToken });
  }),
);

/* POST /auth/logout */
authRouter.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    const token = (req.cookies as Record<string, string | undefined> | undefined)?.refreshToken;
    if (token) {
      await prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(token) } });
    }
    clearRefreshCookie(res);
    res.status(204).end();
  }),
);

/* GET /auth/me */
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw AppError.notFound('Пользователь не найден');
    res.json(toPublicUser(user));
  }),
);
