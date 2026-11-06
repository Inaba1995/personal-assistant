import { useEffect, useMemo, useState } from 'react';
import type { DocumentRecord, DocumentCreateInput } from '@assistant/shared';
import { documentCreateSchema, documentTypeSchema } from '@assistant/shared';
import { useAiAsk, useCrudList, useCrudMutations } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { Markdown } from '../lib/markdown';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

const TYPE_LABELS: Record<string, string> = {
  NOTE: '📝 Заметка',
  LETTER: '✉️ Письмо',
  DOC: '📄 Документ',
};

const LETTER_TEMPLATES: { name: string; text: string }[] = [
  {
    name: 'Приветствие',
    text: 'Здравствуйте, {Имя}!\n\n',
  },
  {
    name: 'Подпись',
    text: '\n\nС уважением,\n{Имя}\n{Должность}\n{Телефон}',
  },
  {
    name: 'Напоминание о сроке',
    text: 'Напоминаю, что срок ответа — до конца текущей недели. Если нужны уточнения, сообщите, пожалуйста.\n\n',
  },
  {
    name: 'Благодарность',
    text: 'Спасибо за проделанную работу и оперативную обратную связь!\n\n',
  },
];

export function Documents() {
  const { data, isLoading } = useCrudList<DocumentRecord>('documents', 'documents', {
    limit: 100,
    sort: '-updatedAt',
  });
  const mutations = useCrudMutations<DocumentCreateInput, DocumentRecord>({
    key: 'documents',
    resource: 'documents',
    createMessage: 'Документ создан',
    updateMessage: 'Документ сохранён',
    deleteMessage: 'Документ удалён',
  });
  const ai = useAiAsk();
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [draft, setDraft] = useState<DocumentCreateInput>({
    title: '',
    content: '',
    type: 'NOTE',
  });
  const [dirty, setDirty] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState<string | null>(null);

  const items = data?.items ?? [];
  const filtered = useMemo(
    () => (typeFilter ? items.filter((item) => item.type === typeFilter) : items),
    [items, typeFilter],
  );
  const selected = items.find((item) => item.id === selectedId) ?? null;

  // Загружаем выбранный документ в черновик.
  useEffect(() => {
    if (!selected) return;
    setDraft({ title: selected.title, content: selected.content, type: selected.type });
    setDirty(false);
  }, [selectedId]);

  const patchDraft = (patch: Partial<DocumentCreateInput>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const handleCreate = (): void => {
    mutations.create.mutate(
      { title: 'Новый документ', content: '', type: 'NOTE' },
      { onSuccess: (created) => setSelectedId(created.id) },
    );
  };

  const handleSave = (): void => {
    if (!selected) return;
    const parsed = documentCreateSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте поля документа');
      return;
    }
    mutations.update.mutate({ id: selected.id, data: parsed.data });
    setDirty(false);
  };

  const handleDelete = (): void => {
    if (!selected) return;
    if (!window.confirm(`Удалить документ «${selected.title}»?`)) return;
    mutations.remove.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setDirty(false);
      },
    });
  };

  const applyTemplate = (text: string): void => {
    const ready = text
      .replace('{Имя}', 'Иван')
      .replace('{Должность}', 'менеджер')
      .replace('{Телефон}', '+7 900 000-00-00');
    patchDraft({ content: draft.content + ready });
    toast.info('Шаблон добавлен в документ');
  };

  const generateLetter = (): void => {
    ai.mutate(
      { prompt: aiPrompt },
      {
        onSuccess: (response) => {
          if (response.fallback) {
            setAiResult(null);
            toast.info(response.message ?? 'ИИ недоступен');
            return;
          }
          setAiResult(response.response ?? '');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const insertAiResult = (replace: boolean): void => {
    if (!aiResult) return;
    patchDraft({ content: replace ? aiResult : `${draft.content}\n\n${aiResult}`.trim() });
    setAiOpen(false);
    setAiResult(null);
    setAiPrompt('');
    toast.success(replace ? 'Текст заменён' : 'Текст добавлен');
  };

  if (isLoading) return <PageLoader label="Загрузка документов…" />;

  return (
    <div>
      <PageHeader
        title="Документы"
        description="Заметки, письма и документы. Markdown-превью, шаблоны и генерация письма с ИИ."
        actions={
          <button type="button" className="btn-primary" onClick={handleCreate}>
            + Новый документ
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Список */}
        <aside className="card flex max-h-44 flex-col p-3 lg:max-h-[70vh]">
          <select
            className="input mb-2"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="Фильтр по типу"
          >
            <option value="">Все типы</option>
            <option value="NOTE">Заметки</option>
            <option value="LETTER">Письма</option>
            <option value="DOC">Документы</option>
          </select>

          <div className="flex-1 space-y-1.5 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">Документов нет</p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${ selectedId === item.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800' }`}
                >
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{TYPE_LABELS[item.type]}</span>
                    <span>{formatDateTime(item.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Редактор */}
        <section className="card flex min-h-[60vh] flex-col p-4">
          {!selected ? (
            <EmptyState
              title="Выберите документ"
              description="Слева — список ваших документов. Создайте новый, чтобы начать писать."
              icon="📄"
              action={
                <button type="button" className="btn-primary" onClick={handleCreate}>
                  Создать документ
                </button>
              }
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-end gap-2">
                <div className="min-w-48 flex-1">
                  <label className="label" htmlFor="doc-title">
                    Название
                  </label>
                  <input
                    id="doc-title"
                    className="input"
                    value={draft.title}
                    onChange={(event) => patchDraft({ title: event.target.value })}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="doc-type">
                    Тип
                  </label>
                  <select
                    id="doc-type"
                    className="input w-auto!"
                    value={draft.type}
                    onChange={(event) =>
                      patchDraft({ type: event.target.value as DocumentCreateInput['type'] })
                    }
                  >
                    {documentTypeSchema.options.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label" htmlFor="doc-template">
                    Шаблон
                  </label>
                  <select
                    id="doc-template"
                    className="input w-auto!"
                    value=""
                    onChange={(event) => {
                      const template = LETTER_TEMPLATES.find((t) => t.name === event.target.value);
                      if (template) applyTemplate(template.text);
                    }}
                  >
                    <option value="">Вставить…</option>
                    {LETTER_TEMPLATES.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className={`px-3 py-1.5 text-sm ${mode === 'edit' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    Редактор
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`px-3 py-1.5 text-sm ${mode === 'preview' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300'}`}
                  >
                    Превью
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setAiPrompt(
                      draft.type === 'LETTER'
                        ? `Напиши деловое письмо по теме: ${draft.title || 'без темы'}`
                        : `Помоги оформить текст документа «${draft.title}»: `,
                    );
                    setAiResult(null);
                    setAiOpen(true);
                  }}
                >
                  ✨ Сгенерировать письмо с ИИ
                </button>

                <div className="ml-auto flex items-center gap-2">
                  {dirty ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">● не сохранено</span>
                  ) : null}
                  <button
                    type="button"
                    className="btn-danger py-1.5! text-xs"
                    onClick={handleDelete}
                    disabled={mutations.remove.isPending}
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    className="btn-primary py-1.5! text-xs"
                    onClick={handleSave}
                    disabled={mutations.update.isPending || !dirty}
                  >
                    {mutations.update.isPending ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>
              </div>

              {mode === 'edit' ? (
                <textarea
                  className="input min-h-[45vh] flex-1 resize-y font-mono text-sm"
                  value={draft.content}
                  onChange={(event) => patchDraft({ content: event.target.value })}
                  placeholder="# Заголовок\n\nТекст документа. Поддерживается **жирный**, *курсив* и списки:\n- пункт 1\n- пункт 2"
                  aria-label="Содержимое документа"
                />
              ) : (
                <div className="min-h-[45vh] flex-1 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  {draft.content.trim() ? (
                    <Markdown text={draft.content} />
                  ) : (
                    <p className="text-sm text-slate-400">Документ пуст.</p>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-slate-400">
                Обновлён: {formatDateTime(selected.updatedAt)} · Символов: {draft.content.length}
              </p>
            </>
          )}
        </section>
      </div>

      {/* Модалка ИИ-генерации */}
      <Modal
        open={aiOpen}
        title="Генерация текста с ИИ"
        onClose={() => setAiOpen(false)}
        wide
        footer={
          aiResult ? (
            <>
              <button type="button" className="btn-secondary" onClick={() => setAiOpen(false)}>
                Отмена
              </button>
              <button type="button" className="btn-secondary" onClick={() => insertAiResult(false)}>
                Добавить в конец
              </button>
              <button type="button" className="btn-primary" onClick={() => insertAiResult(true)}>
                Заменить содержимое
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn-secondary" onClick={() => setAiOpen(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={generateLetter}
                disabled={ai.isPending || aiPrompt.trim() === ''}
              >
                {ai.isPending ? 'Генерация…' : 'Сгенерировать'}
              </button>
            </>
          )
        }
      >
        <label className="label" htmlFor="ai-prompt">
          Запрос
        </label>
        <textarea
          id="ai-prompt"
          className="input min-h-24"
          value={aiPrompt}
          onChange={(event) => setAiPrompt(event.target.value)}
          placeholder="Напиши письмо клиенту о переносе встречи…"
        />
        {aiResult ? (
          <div className="mt-3">
            <div className="label">Результат</div>
            <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap dark:border-slate-700 dark:bg-slate-950">
              {aiResult}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
