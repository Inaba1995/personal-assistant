/**
 * Настройка тестового окружения: отдельная SQLite-база, тестовые секреты.
 * Выполняется ДО импорта приложения (setupFiles в vitest.config.ts).
 */
import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.JWT_SECRET = 'test-access-secret-value-long-enough';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-value-long-enough';
process.env.OPENAI_API_KEY = '';
process.env.CORS_ORIGIN = 'http://localhost:5173';
process.env.LOG_LEVEL = 'silent';

// Сбрасываем тестовую базу перед прогоном (файл prisma/test.db).
const schemaPath = resolve(__dirname, '..', '..', '..', 'prisma', 'schema.prisma');
execSync(`npx prisma db push --force-reset --skip-generate --schema="${schemaPath}"`, {
  env: { ...process.env },
  stdio: 'pipe',
  cwd: dirname(schemaPath),
});

export {};
