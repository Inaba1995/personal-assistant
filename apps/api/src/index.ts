import { createApp } from './app';
import { config } from './config';
import { logger } from './logger';
import { prisma } from './prisma';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    `API запущен: http://localhost:${config.port} (env=${config.env}, ` +
      `OpenAI: ${config.openaiApiKey ? 'включён' : 'заглушка'})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal}: завершение работы…`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Подстраховка, если сервер не закроется сам.
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
