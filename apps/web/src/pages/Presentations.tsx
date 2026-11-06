import { useState } from 'react';
import type { Presentation, PresentationCreateInput, Slide } from '@assistant/shared';
import { presentationCreateSchema } from '@assistant/shared';
import { useCrudAll, useCrudMutations } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../lib/format';
import { exportPptx } from '../lib/pptx';
import { useToast } from '../lib/toast';

const bulletsToText = (bullets: string[]): string => bullets.join('\n');
const textToBullets = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

export function Presentations() {
  const { data, isLoading } = useCrudAll<Presentation>('presentations', 'presentations', {
    sort: '-updatedAt',
  });
  const mutations = useCrudMutations<PresentationCreateInput, Presentation>({
    key: 'presentations',
    resource: 'presentations',
    createMessage: 'Презентация создана',
    updateMessage: 'Презентация сохранена',
    deleteMessage: 'Презентация удалена',
  });
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PresentationCreateInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [exporting, setExporting] = useState(false);

  const items = data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const selectPresentation = (presentation: Presentation): void => {
    setSelectedId(presentation.id);
    setDraft({ title: presentation.title, slides: presentation.slides });
    setDirty(false);
  };

  const patch = (next: Partial<PresentationCreateInput>): void => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    setDirty(true);
  };

  const patchSlide = (index: number, slide: Partial<Slide>): void => {
    if (!draft) return;
    patch({
      slides: draft.slides.map((item, i) => (i === index ? { ...item, ...slide } : item)),
    });
  };

  const addSlide = (): void => {
    if (!draft) return;
    patch({ slides: [...draft.slides, { title: `Слайд ${draft.slides.length + 1}`, bullets: [] }] });
  };

  const removeSlide = (index: number): void => {
    if (!draft) return;
    patch({ slides: draft.slides.filter((_, i) => i !== index) });
  };

  const moveSlide = (index: number, direction: -1 | 1): void => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.slides.length) return;
    const slides = [...draft.slides];
    const a = slides[index];
    const b = slides[target];
    if (!a || !b) return;
    slides[index] = b;
    slides[target] = a;
    patch({ slides });
  };

  const handleSave = (): void => {
    if (!selected || !draft) return;
    const parsed = presentationCreateSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте презентацию');
      return;
    }
    mutations.update.mutate({ id: selected.id, data: parsed.data });
    setDirty(false);
  };

  const handleCreate = (): void => {
    mutations.create.mutate({
      title: `Презентация ${items.length + 1}`,
      slides: [{ title: 'Титульный слайд', bullets: ['Автор', 'Дата'] }],
    });
  };

  const handleDelete = (): void => {
    if (!selected) return;
    if (!window.confirm(`Удалить презентацию «${selected.title}»?`)) return;
    mutations.remove.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setDraft(null);
      },
    });
  };

  const handleExport = async (): Promise<void> => {
    if (!draft) return;
    setExporting(true);
    try {
      await exportPptx(draft.title, draft.slides);
      toast.success('Файл .pptx скачан');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось экспортировать');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <PageLoader label="Загрузка презентаций…" />;

  return (
    <div>
      <PageHeader
        title="Презентации"
        description="Слайды: заголовок + буллеты, перестановка, экспорт в .pptx."
        actions={
          <button type="button" className="btn-primary" onClick={handleCreate}>
            + Новая презентация
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Презентаций пока нет"
          description="Соберите слайды и экспортируйте их в PowerPoint."
          icon="📽️"
          action={
            <button type="button" className="btn-primary" onClick={handleCreate}>
              Создать презентацию
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="card max-h-44 space-y-1.5 overflow-y-auto p-3 lg:max-h-[70vh]">
            {items.map((presentation) => (
              <button
                key={presentation.id}
                type="button"
                onClick={() => selectPresentation(presentation)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${ selectedId === presentation.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800' }`}
              >
                <div className="truncate text-sm font-medium">{presentation.title}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {presentation.slides.length} сл. · {formatDateTime(presentation.updatedAt)}
                </div>
              </button>
            ))}
          </aside>

          <section className="card p-4">
            {!draft || !selected ? (
              <EmptyState
                title="Выберите презентацию"
                description="Нажмите на презентацию слева, чтобы редактировать слайды."
                icon="🎞️"
              />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <label className="label" htmlFor="pres-title">
                      Название
                    </label>
                    <input
                      id="pres-title"
                      className="input"
                      value={draft.title}
                      onChange={(event) => patch({ title: event.target.value })}
                    />
                  </div>
                  <button type="button" className="btn-secondary" onClick={addSlide}>
                    + Слайд
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => void handleExport()}
                    disabled={exporting}
                  >
                    {exporting ? 'Экспорт…' : '⬇ Экспорт .pptx'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleSave}
                    disabled={mutations.update.isPending || !dirty}
                  >
                    {mutations.update.isPending ? 'Сохранение…' : dirty ? 'Сохранить •' : 'Сохранено'}
                  </button>
                  <button type="button" className="btn-danger py-2! text-xs" onClick={handleDelete}>
                    Удалить
                  </button>
                </div>

                {draft.slides.length === 0 ? (
                  <EmptyState
                    title="Слайдов нет"
                    description="Добавьте первый слайд."
                    icon="➕"
                    action={
                      <button type="button" className="btn-primary" onClick={addSlide}>
                        Добавить слайд
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {draft.slides.map((slide, index) => (
                      <article key={index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            {index + 1}
                          </span>
                          <input
                            className="input py-1.5! font-semibold"
                            value={slide.title}
                            onChange={(event) => patchSlide(index, { title: event.target.value })}
                            aria-label={`Заголовок слайда ${index + 1}`}
                            placeholder="Заголовок слайда"
                          />
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              className="btn-secondary px-2! py-1.5!"
                              onClick={() => moveSlide(index, -1)}
                              disabled={index === 0}
                              aria-label="Переместить выше"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="btn-secondary px-2! py-1.5!"
                              onClick={() => moveSlide(index, 1)}
                              disabled={index === draft.slides.length - 1}
                              aria-label="Переместить ниже"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="btn-secondary px-2! py-1.5!"
                              onClick={() => removeSlide(index)}
                              aria-label={`Удалить слайд ${index + 1}`}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        <textarea
                          className="input min-h-24 text-sm"
                          value={bulletsToText(slide.bullets)}
                          onChange={(event) =>
                            patchSlide(index, { bullets: textToBullets(event.target.value) })
                          }
                          placeholder={'Пункт 1\nПункт 2\nПункт 3'}
                          aria-label={`Буллеты слайда ${index + 1}`}
                        />
                        <p className="mt-1 text-xs text-slate-400">
                          Каждая строка — отдельный буллет ({slide.bullets.length} шт.)
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
