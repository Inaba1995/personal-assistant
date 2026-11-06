import { useState } from 'react';
import type { SearchResponse } from '@assistant/shared';
import { useSearchAnalyze, useSearchHistory } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Markdown } from '../lib/markdown';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

export function SearchAnalyze() {
  const analyze = useSearchAnalyze();
  const history = useSearchHistory();
  const toast = useToast();

  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [viewingHistory, setViewingHistory] = useState<number | null>(null);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!query.trim() || !text.trim()) {
      toast.error('Заполните запрос и текст для анализа');
      return;
    }
    analyze.mutate(
      { query: query.trim(), text: text.trim() },
      {
        onSuccess: (response) => {
          setResult(response);
          setViewingHistory(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const openHistory = (index: number): void => {
    const item = history.data?.items[index];
    if (!item) return;
    setViewingHistory(index);
    setResult({
      id: item.id,
      query: item.query,
      summary: item.summary,
      sources: Array.isArray(item.sources)
        ? (item.sources as { title: string; url: string }[])
        : [],
      fallback: false,
      createdAt: item.createdAt,
    });
    setQuery(item.query);
  };

  return (
    <div>
      <PageHeader
        title="Поиск и анализ"
        description="Вставьте текст или ссылки — ИИ составит выжимку с указанием источников. Скрейпинг не используется."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {/* Форма */}
          <form onSubmit={handleSubmit} className="card space-y-3 p-4">
            <div>
              <label className="label" htmlFor="search-query">
                Запрос *
              </label>
              <input
                id="search-query"
                className="input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Например: сроки ответа на коммерческое предложение"
              />
            </div>
            <div>
              <label className="label" htmlFor="search-text">
                Текст для анализа * (можно вставить ссылки)
              </label>
              <textarea
                id="search-text"
                className="input min-h-44"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={'Вставьте сюда текст статьи, переписки или несколько ссылок:\nhttps://example.com/article\nhttps://example.org/guide'}
              />
              <p className="mt-1 text-xs text-slate-400">
                Символов: {text.length}. Ссылки в тексте будут собраны в список источников.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={analyze.isPending || !query.trim() || !text.trim()}
              >
                {analyze.isPending ? 'Анализируем…' : '🔍 Проанализировать'}
              </button>
            </div>
          </form>

          {/* Результат */}
          {result ? (
            <section className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Выжимка: {result.query}
                </h2>
                <span className="text-xs text-slate-400">{formatDateTime(result.createdAt)}</span>
              </div>

              {result.fallback ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  <strong>Режим заглушки.</strong> {result.message}
                </div>
              ) : (
                <>
                  <Markdown text={result.summary} />
                  {result.sources.length > 0 ? (
                    <div className="mt-4">
                      <div className="label">Источники</div>
                      <ul className="space-y-1">
                        {result.sources.map((source, index) => (
                          <li key={`${source.url}-${index}`} className="text-sm">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-indigo-600 underline hover:text-indigo-500 dark:text-indigo-400"
                            >
                              {source.title}
                            </a>
                            <span className="ml-2 break-all text-xs text-slate-400">
                              {source.url}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : (
            <EmptyState
              title="Результат появится здесь"
              description="Введите запрос и текст — ИИ составит краткую выжимку."
              icon="🔍"
            />
          )}
        </div>

        {/* История */}
        <aside className="card max-h-64 overflow-y-auto p-4 lg:max-h-[70vh]">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            История запросов
          </h2>
          {!history.data || history.data.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Пока пусто</p>
          ) : (
            <ul className="space-y-1.5">
              {history.data.items.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openHistory(index)}
                    className={`w-full rounded-lg border px-3 py-2 text-left ${ viewingHistory === index ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800' }`}
                  >
                    <div className="truncate text-sm font-medium">{item.query}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.createdAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
