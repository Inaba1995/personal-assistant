import { useState } from 'react';
import type { AvitoListing, AvitoCreateInput, AvitoStatus } from '@assistant/shared';
import { avitoCreateSchema, avitoStatusSchema } from '@assistant/shared';
import { useCrudList, useCrudMutations } from '../api/hooks';
import { Badge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { formatPrice, formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

const STATUS_META: Record<AvitoStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Черновик', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  ACTIVE: { label: 'Активно', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  ARCHIVED: { label: 'В архиве', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
};

const REPLY_TEMPLATES: { name: string; text: string }[] = [
  {
    name: 'Ответ на торг',
    text: 'Здравствуйте! Спасибо за интерес. Цена обсуждаема — напишите, какую сумму рассматриваете.',
  },
  {
    name: 'Уточнение деталей',
    text: 'Здравствуйте! Подскажите, пожалуйста, удобные даты и время для просмотра/получения.',
  },
  {
    name: 'Отказ вежливый',
    text: 'Здравствуйте! Спасибо за отклик, к сожалению, предложение больше не актуально.',
  },
  {
    name: 'Благодарность за отзыв',
    text: 'Спасибо за тёплый отзыв! Будем рады помочь и впредь.',
  },
];

interface FormState {
  title: string;
  description: string;
  price: string;
  status: AvitoStatus;
}

export function Avito() {
  const { data, isLoading } = useCrudList<AvitoListing>('avito', 'avito', {
    limit: 100,
    sort: '-updatedAt',
  });
  const mutations = useCrudMutations<AvitoCreateInput, AvitoListing>({
    key: 'avito',
    resource: 'avito',
    createMessage: 'Объявление создано',
    updateMessage: 'Объявление обновлено',
    deleteMessage: 'Объявление удалено',
  });
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AvitoListing | null>(null);
  const [form, setForm] = useState<FormState>({ title: '', description: '', price: '0', status: 'DRAFT' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const listings = data?.items ?? [];

  const openCreate = (): void => {
    setEditing(null);
    setForm({ title: '', description: '', price: '0', status: 'DRAFT' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (listing: AvitoListing): void => {
    setEditing(listing);
    setForm({
      title: listing.title,
      description: listing.description,
      price: String(listing.price),
      status: listing.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = avitoCreateSchema.safeParse({
      title: form.title,
      description: form.description,
      price: form.price === '' ? 0 : form.price,
      status: form.status,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    if (editing) {
      mutations.update.mutate(
        { id: editing.id, data: parsed.data },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      mutations.create.mutate(parsed.data, { onSuccess: () => setModalOpen(false) });
    }
  };

  const copyListing = async (listing: AvitoListing): Promise<void> => {
    const text = `${listing.title}\n\n${listing.description}\n\nЦена: ${formatPrice(listing.price)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Текст объявления скопирован');
    } catch {
      toast.error('Не удалось скопировать — браузер запретил доступ к буферу');
    }
  };

  const handleDelete = (listing: AvitoListing): void => {
    if (window.confirm(`Удалить объявление «${listing.title}»?`)) {
      mutations.remove.mutate(listing.id);
    }
  };

  if (isLoading) return <PageLoader label="Загрузка объявлений…" />;

  return (
    <div>
      <PageHeader
        title="Авито — ручной режим"
        description="Хранение объявлений и шаблоны ответов. Интеграция с API Авито не используется."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Объявление
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200">
        ℹ️ Режим без интеграции: данные хранятся локально, публикация и ответы ведутся вручную через
        сайт Авито. Кнопка «Скопировать текст» переносит объявление в буфер обмена.
      </div>

      {listings.length === 0 ? (
        <EmptyState
          title="Объявлений нет"
          description="Добавьте первое объявление: заголовок, описание, цена и статус."
          icon="🏷️"
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Создать объявление
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <article key={listing.id} className="card flex flex-col p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="min-w-0 text-sm font-semibold leading-snug">{listing.title}</h3>
                <Badge className={STATUS_META[listing.status].className}>
                  {STATUS_META[listing.status].label}
                </Badge>
              </div>

              <p className="mb-3 line-clamp-3 flex-1 text-xs text-slate-500 dark:text-slate-400">
                {listing.description || 'Без описания'}
              </p>

              <div className="mb-3 flex items-center justify-between">
                <span className="text-base font-bold">{formatPrice(listing.price)}</span>
                <span className="text-[11px] text-slate-400">{formatDateTime(listing.updatedAt)}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  className="input w-auto! flex-1 py-1.5! text-xs"
                  value={listing.status}
                  onChange={(event) =>
                    mutations.update.mutate({
                      id: listing.id,
                      data: { status: event.target.value as AvitoStatus },
                    })
                  }
                  aria-label={`Статус объявления «${listing.title}»`}
                >
                  {avitoStatusSchema.options.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_META[status].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary px-2! py-1.5! text-xs"
                  onClick={() => void copyListing(listing)}
                  title="Скопировать текст"
                >
                  📋
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2! py-1.5! text-xs"
                  onClick={() => openEdit(listing)}
                  aria-label="Редактировать"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-secondary px-2! py-1.5! text-xs"
                  onClick={() => handleDelete(listing)}
                  aria-label="Удалить"
                >
                  🗑️
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Шаблоны ответов */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Шаблоны ответов в переписке
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {REPLY_TEMPLATES.map((template) => (
            <div key={template.name} className="card p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {template.name}
                </span>
                <button
                  type="button"
                  className="btn-secondary px-2! py-1! text-xs"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(template.text)
                      .then(() => toast.success('Шаблон скопирован'))
                      .catch(() => toast.error('Не удалось скопировать'));
                  }}
                >
                  Скопировать
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{template.text}</p>
            </div>
          ))}
        </div>
      </section>

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать объявление' : 'Новое объявление'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="avito-title">
              Заголовок *
            </label>
            <input
              id="avito-title"
              className="input"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Продам монитор 27″"
              autoFocus
            />
            {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="avito-description">
              Описание
            </label>
            <textarea
              id="avito-description"
              className="input min-h-32"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Состояние, комплектация, способ передачи…"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="avito-price">
                Цена, ₽
              </label>
              <input
                id="avito-price"
                type="number"
                min="0"
                className="input"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              />
              {errors.price ? <p className="mt-1 text-xs text-rose-600">{errors.price}</p> : null}
            </div>
            <div>
              <label className="label" htmlFor="avito-status">
                Статус
              </label>
              <select
                id="avito-status"
                className="input"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, status: event.target.value as AvitoStatus }))
                }
              >
                {avitoStatusSchema.options.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={mutations.create.isPending || mutations.update.isPending}>
              {editing ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
