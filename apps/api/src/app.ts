import { existsSync } from 'node:fs';
import { join } from 'node:path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { config } from './config';
import { logger } from './logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { aiRouter } from './routes/ai';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { avitoRouter } from './routes/avito';
import { commentsRouter } from './routes/comments';
import { contractorsRouter } from './routes/contractors';
import { dashboardRouter } from './routes/dashboard';
import { deadlinesRouter } from './routes/deadlines';
import { documentsRouter } from './routes/documents';
import { exportRouter } from './routes/export';
import { healthRouter } from './routes/health';
import { presentationsRouter } from './routes/presentations';
import { searchRouter } from './routes/search';
import { settingsRouter } from './routes/settings';
import { spreadsheetsRouter } from './routes/spreadsheets';
import { tasksRouter } from './routes/tasks';
import { authLimiter } from './lib/rateLimit';
import { videoRouter } from './routes/video';

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);

  // Безопасность: заголовки + CORS только для origin фронта.
  app.use(
    helmet({
      // CSP отключён: в проде API отдаёт статику Vite, в dev фронт идёт через Vite proxy.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/api/health' },
    }),
  );

  // Health-check
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  // Аутентификация (rate limited)
  app.use('/api/auth', authLimiter, authRouter);

  // CRUD-ресурсы (все, кроме /auth, требуют JWT — см. crudFactory/middleware)
  app.use('/api/tasks', tasksRouter);
  app.use('/api/deadlines', deadlinesRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/spreadsheets', spreadsheetsRouter);
  app.use('/api/presentations', presentationsRouter);
  app.use('/api/avito', avitoRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/contractors', contractorsRouter);

  // ИИ, поиск, видео
  app.use('/api/ai', aiRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/video', videoRouter);

  // Сводка, настройки, экспорт, админ
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/admin', adminRouter);

  // Продакшен: отдаём собранный фронт, если он есть.
  const indexHtml = join(config.webDistPath, 'index.html');
  if (existsSync(indexHtml)) {
    app.use(express.static(config.webDistPath));
    app.use((req: Request, res: Response, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(indexHtml);
    });
  }

  app.use('/api', notFoundHandler);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
