import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@assistant/shared';
import { config } from '../config';
import { AppError } from '../errors';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string;
}

export const PASSWORD_HASH_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_COST);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string, role: Role): string {
  // jti делает каждый токен уникальным (иначе два токена в одну секунду совпадут).
  return jwt.sign({ sub: userId, role, type: 'access', jti: randomUUID() }, config.jwtSecret, {
    expiresIn: config.accessTokenTtlSeconds,
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti, type: 'refresh' }, config.jwtRefreshSecret, {
    expiresIn: `${config.refreshTokenTtlDays}d`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw AppError.unauthorized('Недействительный или истёкший токен');
  }
  if (typeof payload === 'string' || payload.type !== 'access' || typeof payload.sub !== 'string') {
    throw AppError.unauthorized('Недействительный токен');
  }
  return { sub: payload.sub, role: payload.role as Role, type: 'access' };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtRefreshSecret);
  } catch {
    throw AppError.unauthorized('Refresh-токен недействителен');
  }
  if (
    typeof payload === 'string' ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.jti !== 'string'
  ) {
    throw AppError.unauthorized('Refresh-токен недействителен');
  }
  return { sub: payload.sub, jti: payload.jti, type: 'refresh' };
}

/** Проверка JWT; при успехе заполняет req.userId / req.userRole. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(AppError.unauthorized());
    return;
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.userId = payload.sub;
    req.userRole = payload.role;
    next();
  } catch (err) {
    next(err);
  }
}

/** Только для роли ADMIN (403 для остальных). */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    next(AppError.forbidden('Доступ только для администратора'));
    return;
  }
  next();
}
