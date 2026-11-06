import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DocumentRecord, Task } from '@assistant/shared';
import { useCrudAll } from '../api/hooks';

/**
 * Быстрый поиск в верхней панели: ищет по названиям задач и документов,
 * показывает выпадающие результаты.
 */
interface QuickSearchProps {
  className?: string;
}

export function QuickSearch({
  className = 'relative min-w-0 flex-1 max-w-md',
}: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const tasks = useCrudAll<Task>('quick-tasks', 'tasks', { limit: 100 }, enabled);
  const documents = useCrudAll<DocumentRecord>('quick-docs', 'documents', { limit: 100 }, enabled);

  const lower = trimmed.toLowerCase();
  const results = [
    ...(tasks.data?.items ?? [])
      .filter((task) => task.title.toLowerCase().includes(lower))
      .slice(0, 5)
      .map((task) => ({ id: `t-${task.id}`, title: task.title, hint: 'Задача', to: '/tasks' })),
    ...(documents.data?.items ?? [])
      .filter((doc) => doc.title.toLowerCase().includes(lower))
      .slice(0, 5)
      .map((doc) => ({ id: `d-${doc.id}`, title: doc.title, hint: 'Документ', to: '/documents' })),
  ].slice(0, 8);

  const showDropdown = focused && enabled;

  return (
    <div className={`${className}`} onMouseLeave={() => setFocused(false)}>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        placeholder="Быстрый поиск: задачи, документы…"
        aria-label="Быстрый поиск"
        className="input pl-9"
      />
      <svg
        className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
        <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {showDropdown ? (
        <div className="card absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto p-1 shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">
              {tasks.isLoading || documents.isLoading ? 'Поиск…' : 'Ничего не найдено'}
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  navigate(item.to);
                  setQuery('');
                  setFocused(false);
                }}
              >
                <span className="truncate">{item.title}</span>
                <span className="shrink-0 text-xs text-slate-400">{item.hint}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
