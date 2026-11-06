import { useMemo, useState } from 'react';
import type { Deadline, DeadlineCreateInput } from '@assistant/shared';
import { deadlineCreateSchema } from '@assistant/shared';
import { useCrudAll, useCrudMutations } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime, formatRelativeDay, isOverdue, toDateInputValue } from '../lib/format';

interface FormState {
  title: string;
  date: string;
}

function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7; // неделя с понедельника
  const cells: Date[] = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(new Date(first.getFullYear(), first.getMonth(), 1 - (startOffset - i)));
  }
  for (let day = 1; day <= new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1] ?? first;
    cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return cells;
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function Deadlines() {
  const { data, isLoading } = useCrudAll<Deadline>('deadlines', 'deadlines', { sort: 'date' });
  const mutations = useCrudMutations<DeadlineCreateInput, Deadline>({
    key: 'deadlines',
    resource: 'deadlines',
    createMessage: 'Дедлайн добавлен',
    updateMessage: 'Дедлайн обновлён',
    deleteMessage: 'Дедлайн удалён',
  });

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [form, setForm] = useState<FormState>({ title: '', date: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const deadlines = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  const byDay = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const item of deadlines) {
      const key = toDateInputValue(item.date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [deadlines]);

  const cells = monthGrid(month);
  const now = new Date();

  const openCreate = (date?: Date): void => {
    setEditing(null);
    setForm({
      title: '',
      date: toDateInputValue(date ? date.toISOString() : new Date().toISOString()),
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (deadline: Deadline): void => {
    setEditing(deadline);
    setForm({ title: deadline.title, date: toDateInputValue(deadline.date) });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = deadlineCreateSchema.safeParse({ title: form.title, date: form.date });
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

  const handleDelete = (deadline: Deadline): void => {
    if (window.confirm(`Удалить дедлайн «${deadline.title}»?`)) {
      mutations.remove.mutate(deadline.id);
    }
  };

  const visible = selectedDay ? byDay.get(selectedDay) ?? [] : deadlines;
  const overdue = deadlines.filter((item) => isOverdue(item.date));

  if (isLoading) return <PageLoader label="Загрузка дедлайнов…" />;

  return (
    <div>
      <PageHeader
        title="Дедлайны"
        description="Календарь и список. Просроченные подсвечены, напоминания — на Главной и в меню."
        actions={
          <button type="button" className="btn-primary" onClick={() => openCreate()}>
            + Дедлайн
          </button>
        }
      />

      {overdue.length > 0 ? (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          ⚠️ Просрочено дедлайнов: <strong>{overdue.length}</strong> — {overdue[0]?.title}
          {overdue.length > 1 ? ' и другие' : ''}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* Календарь */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              className="btn-secondary px-2.5! py-1.5!"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              aria-label="Предыдущий месяц"
            >
              ←
            </button>
            <h2 className="text-sm font-semibold capitalize">
              {month.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              type="button"
              className="btn-secondary px-2.5! py-1.5!"
              onClick={() => setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              aria-label="Следующий месяц"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              const key = toDateInputValue(date.toISOString());
              const items = byDay.get(key) ?? [];
              const isToday = sameDay(date, now);
              const inMonth = date.getMonth() === month.getMonth();
              const isSelected = selectedDay === key;
              const hasOverdue = items.some((item) => isOverdue(item.date));
              return (
                <button
                  key={`${key}-${index}`}
                  type="button"
                  onClick={() => setSelectedDay((prev) => (prev === key ? null : key))}
                  className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm transition-colors ${ isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800' } ${inMonth ? '' : 'opacity-30'} ${ isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : '' }`}
                  aria-label={`${key}, дедлайнов: ${items.length}`}
                  aria-pressed={isSelected}
                >
                  <span>{date.getDate()}</span>
                  {items.length > 0 ? (
                    <span className="absolute bottom-1 flex gap-0.5">
                      {items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={`h-1.5 w-1.5 rounded-full ${ hasOverdue && isOverdue(item.date) ? 'bg-rose-500' : 'bg-amber-500' }`}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> предстоящий
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> просрочен
            </span>
            {selectedDay ? (
              <button
                type="button"
                className="ml-auto font-medium text-indigo-600 underline dark:text-indigo-400"
                onClick={() => setSelectedDay(null)}
              >
                Показать все
              </button>
            ) : null}
          </div>
        </section>

        {/* Список */}
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {selectedDay ? `Дедлайны ${new Date(`${selectedDay}T12:00:00`).toLocaleDateString('ru-RU')}` : 'Все дедлайны'}
          </h2>

          {visible.length === 0 ? (
            <EmptyState
              title="Дедлайнов нет"
              description="Добавьте дедлайн — он появится в календаре и напоминаниях."
              icon="⏰"
              action={
                <button type="button" className="btn-primary" onClick={() => openCreate()}>
                  Добавить
                </button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((deadline) => {
                const isLate = isOverdue(deadline.date);
                return (
                  <li
                    key={deadline.id}
                    className={`rounded-lg border p-3 ${ isLate ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40' : 'border-slate-200 dark:border-slate-700' }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{deadline.title}</div>
                        <div
                          className={`mt-0.5 text-xs ${isLate ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                          {formatRelativeDay(deadline.date)} · {formatDateTime(deadline.date)}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => openEdit(deadline)}
                          aria-label={`Редактировать «${deadline.title}»`}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                          onClick={() => handleDelete(deadline)}
                          aria-label={`Удалить «${deadline.title}»`}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать дедлайн' : 'Новый дедлайн'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="deadline-title">
              Название *
            </label>
            <input
              id="deadline-title"
              className="input"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Сдать отчёт"
              autoFocus
            />
            {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
          </div>
          <div>
            <label className="label" htmlFor="deadline-date">
              Дата *
            </label>
            <input
              id="deadline-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
            {errors.date ? <p className="mt-1 text-xs text-rose-600">{errors.date}</p> : null}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={mutations.create.isPending || mutations.update.isPending}>
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
