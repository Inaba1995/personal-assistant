import { useState } from 'react';
import type { VideoSummaryResponse } from '@assistant/shared';
import { useVideoHistory, useVideoSummary } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Markdown } from '../lib/markdown';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

export function VideoSummary() {
  const summarize = useVideoSummary();
  const history = useVideoHistory();
  const toast = useToast();

  const [url, setUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<VideoSummaryResponse | null>(null);

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (!transcript.trim()) {
      toast.error('Вставьте транскрипт или текст видео');
      return;
    }
    summarize.mutate(
      { url: url.trim(), transcript: transcript.trim() },
      {
        onSuccess: (response) => setResult(response),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const exampleTranscript =
    '00:00 Вступление: сегодня разбираем тайм-менеджмент\n' +
    '03:15 Матрица Эйзенхауэра: срочное и важное\n' +
    '12:40 Правило двух минут: делай сразу, если это быстро';

  return (
    <div>
      <PageHeader
        title="Видео-резюме"
        description="Вставьте транскрипт (или URL + текст) — получите резюме и таймкоды."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="card space-y-3 p-4">
            <div>
              <label className="label" htmlFor="video-url">
                URL видео (необязательно)
              </label>
              <input
                id="video-url"
                type="url"
                className="input"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div>
              <label className="label" htmlFor="video-transcript">
                Транскрипт *
              </label>
              <textarea
                id="video-transcript"
                className="input min-h-52 font-mono text-sm"
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder={exampleTranscript}
              />
              <p className="mt-1 text-xs text-slate-400">
                Строки вида «12:34 текст» будут распознаны как таймкоды.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTranscript(exampleTranscript)}
              >
                Вставить пример
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={summarize.isPending || !transcript.trim()}
              >
                {summarize.isPending ? 'Составляем…' : '🎬 Сделать резюме'}
              </button>
            </div>
          </form>

          {result ? (
            <section className="card p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Резюме {result.url ? 'видео' : 'текста'}
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

                  {result.timestamps.length > 0 ? (
                    <div className="mt-4">
                      <div className="label">Таймкоды</div>
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                        {result.timestamps.map((stamp, index) => (
                          <li key={`${stamp.time}-${index}`} className="flex gap-3 px-3 py-2 text-sm">
                            <span className="shrink-0 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                              {stamp.time}
                            </span>
                            <span>{stamp.note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      Таймкоды в тексте не найдены — добавьте строки вида «12:34 …».
                    </p>
                  )}
                </>
              )}
            </section>
          ) : (
            <EmptyState
              title="Резюме появится здесь"
              description="Поддерживаются транскрипты с таймкодами вида «03:15 текст»."
              icon="🎬"
            />
          )}
        </div>

        <aside className="card max-h-64 overflow-y-auto p-4 lg:max-h-[70vh]">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            История
          </h2>
          {!history.data || history.data.items.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Пока пусто</p>
          ) : (
            <ul className="space-y-1.5">
              {history.data.items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <div className="truncate text-sm font-medium">
                    {item.url || 'Текст без ссылки'}
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {item.summary.slice(0, 80)}…
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {formatDateTime(item.createdAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
