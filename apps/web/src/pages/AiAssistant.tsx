import { useEffect, useRef, useState } from 'react';
import { useAiAsk, useAiHistory, useSettings } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { Markdown } from '../lib/markdown';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  model?: string;
  fallback?: boolean;
  createdAt?: string;
}

const PROMPT_TEMPLATES: { label: string; text: string }[] = [
  { label: 'Сделай выжимку', text: 'Сделай выжимку текста: 3–5 ключевых пунктов.\n\nТекст:\n' },
  { label: 'Перепиши письмо', text: 'Перепиши письмо вежливом и деловом стиле, сохранив смысл:\n\n' },
  { label: 'Составь план', text: 'Составь пошаговый план: что сделать в первую очередь, что потом.\n\nКонтекст:\n' },
  { label: 'Проверь грамотность', text: 'Проверь текст на ошибки и исправь его:\n\n' },
];

export function AiAssistant() {
  const history = useAiHistory();
  const settings = useSettings();
  const ask = useAiAsk();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Первичная подгрузка истории как сообщений чата.
  useEffect(() => {
    if (hydrated || !history.data) return;
    const fromHistory: ChatMessage[] = [];
    for (const item of [...history.data.items].reverse()) {
      fromHistory.push({
        id: `${item.id}-p`,
        role: 'user',
        text: item.prompt,
        createdAt: item.createdAt,
      });
      fromHistory.push({
        id: `${item.id}-a`,
        role: 'assistant',
        text: item.response,
        model: item.model,
        createdAt: item.createdAt,
      });
    }
    setMessages(fromHistory);
    setHydrated(true);
  }, [history.data, hydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ask.isPending]);

  const send = (): void => {
    const prompt = input.trim();
    if (!prompt || ask.isPending) return;
    setInput('');
    const userMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      text: prompt,
    };
    setMessages((prev) => [...prev, userMessage]);

    ask.mutate(
      { prompt },
      {
        onSuccess: (response) => {
          setMessages((prev) => [
            ...prev,
            {
              id: `local-a-${Date.now()}`,
              role: 'assistant',
              text: response.response ?? '',
              model: response.model,
              fallback: response.fallback,
              createdAt: new Date().toISOString(),
            },
          ]);
        },
        onError: (err) => {
          toast.error(err.message);
          setMessages((prev) => [
            ...prev,
            {
              id: `local-e-${Date.now()}`,
              role: 'assistant',
              text: `⚠️ ${err.message}`,
              fallback: true,
            },
          ]);
        },
      },
    );
  };

  return (
    <div className="flex h-[calc(100dvh-10.5rem)] flex-col md:h-[calc(100dvh-8.5rem)]">
      <PageHeader
        title="ИИ-ассистент"
        description="Чат на OpenAI: выжимки, переписывание писем, планы. История сохраняется."
        actions={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Модель: {settings.data?.aiModel ?? 'gpt-4o-mini'}
          </span>
        }
      />

      {/* Шаблоны промптов */}
      <div className="mb-3 flex flex-wrap gap-2">
        {PROMPT_TEMPLATES.map((template) => (
          <button
            key={template.label}
            type="button"
            className="btn-secondary py-1.5! text-xs"
            onClick={() => setInput(template.text)}
          >
            {template.label}
          </button>
        ))}
        {messages.length > 0 ? (
          <button
            type="button"
            className="btn-secondary ml-auto py-1.5! text-xs"
            onClick={() => setMessages([])}
          >
            Очистить чат
          </button>
        ) : null}
      </div>

      {/* Лента сообщений */}
      <div className="card mb-3 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && !ask.isPending ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl" aria-hidden>
              ✨
            </span>
            <p className="text-sm font-medium">Спросите что угодно</p>
            <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
              «Сделай выжимку», «Перепиши письмо», «Составь план» — кнопки-шаблоны выше подставят
              текст запроса.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${ message.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100' }`}
              >
                {message.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{message.text}</div>
                ) : message.fallback ? (
                  <div className="space-y-2">
                    <div className="font-semibold">Режим заглушки</div>
                    <div className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <Markdown text={message.text} />
                )}
                <div
                  className={`mt-1.5 text-[10px] ${message.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}
                >
                  {message.model ? `${message.model} · ` : ''}
                  {message.createdAt ? formatDateTime(message.createdAt) : 'только что'}
                </div>
              </div>
            </div>
          ))
        )}

        {ask.isPending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>

      {/* Ввод */}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          className="input min-h-12 flex-1 resize-none"
          rows={2}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
          placeholder="Введите запрос… (Enter — отправить, Shift+Enter — новая строка)"
          aria-label="Запрос к ИИ"
        />
        <button type="submit" className="btn-primary" disabled={ask.isPending || !input.trim()}>
          {ask.isPending ? '…' : 'Отправить'}
        </button>
      </form>
    </div>
  );
}
