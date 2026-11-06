import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { config } from '../config';
import { AppError } from '../errors';
import { logger } from '../logger';
import { prisma } from '../prisma';

export const AI_FALLBACK_MESSAGE =
  'OPENAI_API_KEY не задан — разделы ИИ работают в режиме заглушки. ' +
  'Чтобы включить реальные ответы: добавьте ключ в файл .env на сервере ' +
  '(OPENAI_API_KEY=sk-...), сохраните и перезапустите приложение. ' +
  'Ключ не редактируется из интерфейса и никогда не попадает в базу данных.';

const SYSTEM_PROMPT = [
  'Ты — персональный ассистент для офисной работы (задачи, письма, документы, отчёты).',
  'Правила:',
  '1. Всегда отвечай на русском языке.',
  '2. Отвечай кратко и по пунктам, без лишних вводных фраз.',
  '3. Если в запросе переданы источники — перечисли их в конце ответа списком «Источники».',
  '4. Не выдумывай факты: если данных недостаточно, прямо напиши об этом.',
  '5. Не запоминай и не воспроизводи персональные данные пользователя, кроме текста его собственного запроса.',
].join('\n');

export interface AiAskParams {
  userId: string;
  prompt: string;
  model: string;
  sources?: { title: string; url: string }[];
  /** Дополнительная системная инструкция (для поиска/видео). */
  systemHint?: string;
}

export interface AiAskResult {
  id?: string;
  response: string;
  model: string;
  tokensUsed: number | null;
  fallback: boolean;
  message?: string;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Обёртка над OpenAI API: таймаут, 2 ретрая (3 попытки), логирование токенов в AiRequest.
 * При отсутствии OPENAI_API_KEY возвращает fallback-результат, приложение не падает.
 */
class AiService {
  private client: OpenAI | null = null;

  constructor() {
    if (config.openaiApiKey) {
      // maxRetries: 0 — ретраи реализуем сами, чтобы контролировать логи и задержки.
      this.client = new OpenAI({
        apiKey: config.openaiApiKey,
        timeout: 45_000,
        maxRetries: 0,
      });
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async ask(params: AiAskParams): Promise<AiAskResult> {
    if (!this.client) {
      return {
        response: '',
        model: params.model,
        tokensUsed: null,
        fallback: true,
        message: AI_FALLBACK_MESSAGE,
      };
    }

    const messages = this.buildMessages(params);
    let lastError: unknown;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const completion = await this.client.chat.completions.create(
          {
            model: params.model,
            messages,
            temperature: 0.4,
            max_tokens: 1600,
          },
          { timeout: 45_000 },
        );
        const response = completion.choices[0]?.message?.content?.trim() ?? '';
        const tokensUsed = completion.usage?.total_tokens ?? null;
        const id = await this.logRequest(params, response, tokensUsed);
        return { id, response, model: params.model, tokensUsed, fallback: false };
      } catch (err) {
        lastError = err;
        logger.warn({ attempt, model: params.model, err }, 'OpenAI attempt failed');
        if (attempt < 2) await delay(500 * 2 ** attempt);
      }
    }

    logger.error({ err: lastError, model: params.model }, 'OpenAI failed after 3 attempts');
    throw new AppError('AI_UNAVAILABLE', 'Сервис ИИ временно недоступен, попробуйте позже', 502);
  }

  private buildMessages(params: AiAskParams): ChatCompletionMessageParam[] {
    const system =
      params.systemHint !== undefined
        ? `${SYSTEM_PROMPT}\n\nДополнительно: ${params.systemHint}`
        : SYSTEM_PROMPT;

    let userContent = params.prompt;
    if (params.sources && params.sources.length > 0) {
      const list = params.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n');
      userContent = `${userContent}\n\nИсточники пользователя:\n${list}`;
    }

    return [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ];
  }

  /** Логирует запрос в AiRequest (токены). Ошибка логирования не должна ронять ответ. */
  private async logRequest(
    params: AiAskParams,
    response: string,
    tokensUsed: number | null,
  ): Promise<string | undefined> {
    try {
      const saved = await prisma.aiRequest.create({
        data: {
          userId: params.userId,
          prompt: params.prompt.slice(0, 8000),
          response: response.slice(0, 100_000),
          model: params.model,
          tokensUsed,
        },
      });
      return saved.id;
    } catch (err) {
      logger.error({ err }, 'Failed to log AiRequest');
      return undefined;
    }
  }
}

export const aiService = new AiService();
