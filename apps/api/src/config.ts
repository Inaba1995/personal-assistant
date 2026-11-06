/**
 * Конфигурация приложения.
 * Все секреты берутся ТОЛЬКО из .env (см. README, раздел «Безопасность»).
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config as loadDotenv } from 'dotenv';

/** Поднимаемся от каталога модуля вверх в поисках .env (корень репозитория). */
function findEnvFile(): string | undefined {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envPath = findEnvFile();
if (envPath) {
  loadDotenv({ path: envPath });
}

const required = (name: string, fallback: string): string => {
  const value = process.env[name];
  if (value !== undefined && value !== '') return value;
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[config] Переменная ${name} не задана, используется значение по умолчанию`);
  }
  return fallback;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: required('JWT_SECRET', 'dev-access-secret-change-me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  accessTokenTtlSeconds: 15 * 60, // 15 минут
  refreshTokenTtlDays: 7,
  corsOrigin: required('CORS_ORIGIN', 'http://localhost:5173'),
  /** Ключ OpenAI живёт только здесь. В БД и на фронт НИКОГДА не передаётся. */
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  /** Дистрибутив фронта для продакшен-режима (отдаётся API-сервером). */
  webDistPath: join(__dirname, '..', '..', 'web', 'dist'),
};
