import { useMemo, useState } from 'react';
import type { Task, TaskCreateInput, TaskPriority, TaskStatus } from '@assistant/shared';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskCreateSchema,
} from '@assistant/shared';
import { useCrudList, useCrudMutations } from '../api/hooks';
import { PriorityBadge, taskStatusLabel } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { formatRelativeDay, isOverdue, toDateInputValue } from '../lib/format';

const COLUMN_STYLES: Record<TaskStatus, { accent: string; bg: string }> = {
  BACKLOG: { accent: 'bg-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/60' },
  TODO: { accent: 'bg-sky-500', bg: 'bg-sky-50/60 dark:bg-sky-950/30' },
  IN_PROGRESS: { accent: 'bg-indigo-500', bg: 'bg-indigo-50/60 dark:bg-indigo-950/30' },
  DONE: { accent: 'bg-emerald-500', bg: 'bg-emerald-50/60 dark:bg-emerald-950/30' },
};

interface FormState {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  tags: string;
}

const emptyForm: FormState = {
  title: '',
  description: '',
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: '',
  tags: '',
};

function TaskForm({
  initial,
  onSubmit,
  busy,
  onCancel,
}: {
  initial: Task | null;
  onSubmit: (data: TaskCreateInput) => void;
  busy: boolean;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title: initial.title,
          description: initial.description,
          status: initial.status,
          priority: initial.priority,
          dueDate: toDateInputValue(initial.dueDate),
          tags: initial.tags.join(', '),
        }
      : emptyForm,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate === '' ? null : form.dueDate,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    const parsed = taskCreateSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0])] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="task-title">
          Название *
        </label>
        <input
          id="task-title"
          className="input"
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Например: подготовить отчёт"
          autoFocus
        />
        {errors.title ? <p className="mt-1 text-xs text-rose-600">{errors.title}</p> : null}
      </div>

      <div>
        <label className="label" htmlFor="task-description">
          Описание
        </label>
        <textarea
          id="task-description"
          className="input min-h-24 resize-y"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Детали, ссылки, шаги…"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="task-status">
            Статус
          </label>
          <select
            id="task-status"
            className="input"
            value={form.status}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, status: event.target.value as TaskStatus }))
            }
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {taskStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="task-priority">
            Приоритет
          </label>
          <select
            id="task-priority"
            className="input"
            value={form.priority}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, priority: event.target.value as TaskPriority }))
            }
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'LOW' ? 'Низкий' : priority === 'MEDIUM' ? 'Средний' : 'Высокий'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="task-due">
            Дедлайн
          </label>
          <input
            id="task-due"
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
          />
          {errors.dueDate ? <p className="mt-1 text-xs text-rose-600">{errors.dueDate}</p> : null}
        </div>
        <div>
          <label className="label" htmlFor="task-tags">
            Теги (через запятую)
          </label>
          <input
            id="task-tags"
            className="input"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="важное, клиент"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Сохранение…' : initial ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: TaskStatus) => void;
  dragging: boolean;
  onDragStart: (event: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const overdue = task.status !== 'DONE' && isOverdue(task.dueDate);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`card cursor-grab p-3 active:cursor-grabbing ${ dragging ? 'opacity-40 ring-2 ring-indigo-400' : '' }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-medium leading-snug">{task.title}</h3>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            aria-label={`Редактировать «${task.title}»`}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Удалить «${task.title}»`}
            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
          >
            🗑️
          </button>
        </div>
      </div>

      {task.description ? (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          {task.description}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {task.dueDate ? (
          <span
            className={`text-xs ${overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
          >
            📅 {formatRelativeDay(task.dueDate)}
          </span>
        ) : null}
      </div>

      {task.tags.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Смена статуса без drag&drop (тач-устройства) */}
      <select
        className="input mt-2 py-1! text-xs lg:hidden"
        value={task.status}
        onChange={(event) => onStatusChange(event.target.value as TaskStatus)}
        aria-label={`Статус задачи «${task.title}»`}
      >
        {TASK_STATUSES.map((status) => (
          <option key={status} value={status}>
            {taskStatusLabel(status)}
          </option>
        ))}
      </select>
    </article>
  );
}

export function Tasks() {
  const { data, isLoading } = useCrudList<Task>('tasks', 'tasks', {
    limit: 100,
    sort: '-updatedAt',
  });
  const mutations = useCrudMutations<TaskCreateInput, Task>({
    key: 'tasks',
    resource: 'tasks',
    createMessage: 'Задача создана',
    updateMessage: 'Задача обновлена',
    deleteMessage: 'Задача удалена',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [filters, setFilters] = useState({
    priority: '',
    tag: '',
    dueUntil: '',
  });

  const tasks = data?.items ?? [];

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.tag) {
        const needle = filters.tag.toLowerCase();
        if (!task.tags.some((tag) => tag.toLowerCase().includes(needle))) return false;
      }
      if (filters.dueUntil) {
        if (!task.dueDate) return false;
        const limit = new Date(`${filters.dueUntil}T23:59:59`);
        if (new Date(task.dueDate) > limit) return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const hasFilters = Boolean(filters.priority || filters.tag || filters.dueUntil);

  const handleDrop = (status: TaskStatus, event: React.DragEvent): void => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain') || dragId;
    setDragId(null);
    setDropTarget(null);
    if (!id) return;
    const task = tasks.find((item) => item.id === id);
    if (!task || task.status === status) return;
    mutations.update.mutate({ id, data: { status } });
  };

  const openCreate = (): void => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (task: Task): void => {
    setEditing(task);
    setModalOpen(true);
  };

  const handleSubmit = (payload: TaskCreateInput): void => {
    if (editing) {
      mutations.update.mutate(
        { id: editing.id, data: payload },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      mutations.create.mutate(payload, { onSuccess: () => setModalOpen(false) });
    }
  };

  const handleDelete = (task: Task): void => {
    if (window.confirm(`Удалить задачу «${task.title}»?`)) {
      mutations.remove.mutate(task.id);
    }
  };

  if (isLoading) return <PageLoader label="Загрузка задач…" />;

  return (
    <div>
      <PageHeader
        title="Планировщик"
        description="Kanban: перетаскивайте карточки между колонками — статус сохранится."
        actions={
          <button type="button" className="btn-primary" onClick={openCreate}>
            + Новая задача
          </button>
        }
      />

      {/* Фильтры */}
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label" htmlFor="filter-priority">
            Приоритет
          </label>
          <select
            id="filter-priority"
            className="input w-auto!"
            value={filters.priority}
            onChange={(event) => setFilters((prev) => ({ ...prev, priority: event.target.value }))}
          >
            <option value="">Все</option>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority === 'LOW' ? 'Низкий' : priority === 'MEDIUM' ? 'Средний' : 'Высокий'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="filter-tag">
            Тег
          </label>
          <input
            id="filter-tag"
            className="input w-36!"
            value={filters.tag}
            onChange={(event) => setFilters((prev) => ({ ...prev, tag: event.target.value }))}
            placeholder="важное"
          />
        </div>

        <div>
          <label className="label" htmlFor="filter-due">
            Дедлайн до
          </label>
          <input
            id="filter-due"
            type="date"
            className="input w-auto!"
            value={filters.dueUntil}
            onChange={(event) => setFilters((prev) => ({ ...prev, dueUntil: event.target.value }))}
          />
        </div>

        {hasFilters ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setFilters({ priority: '', tag: '', dueUntil: '' })}
          >
            Сбросить
          </button>
        ) : null}

        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          Показано {filtered.length} из {tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="Задач пока нет"
          description="Создайте первую задачу — она появится в колонке «К выполнению»."
          icon="🗂️"
          action={
            <button type="button" className="btn-primary" onClick={openCreate}>
              Создать задачу
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TASK_STATUSES.map((status) => {
            const columnTasks = filtered.filter((task) => task.status === status);
            const style = COLUMN_STYLES[status];
            const active = dropTarget === status;
            return (
              <section
                key={status}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropTarget !== status) setDropTarget(status);
                }}
                onDragLeave={(event) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node)) return;
                  setDropTarget((prev) => (prev === status ? null : prev));
                }}
                onDrop={(event) => handleDrop(status, event)}
                className={`flex min-h-40 flex-col rounded-xl border p-2 transition-colors ${
                  active
                    ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30'
                    : `border-slate-200 dark:border-slate-800 ${style.bg}`
                }`}
              >
                <header className="mb-2 flex items-center gap-2 px-1 py-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.accent}`} aria-hidden />
                  <h2 className="text-sm font-semibold">{taskStatusLabel(status)}</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                    {columnTasks.length}
                  </span>
                </header>

                <div className="flex-1 space-y-2">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      dragging={dragId === task.id}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDelete(task)}
                      onStatusChange={(next) => mutations.update.mutate({ id: task.id, data: { status: next } })}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', task.id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDragId(task.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropTarget(null);
                      }}
                    />
                  ))}

                  {columnTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
                      {active ? 'Отпустите здесь' : 'Перетащите задачу сюда'}
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать задачу' : 'Новая задача'}
        onClose={() => setModalOpen(false)}
      >
        <TaskForm
          key={editing?.id ?? 'new'}
          initial={editing}
          busy={mutations.create.isPending || mutations.update.isPending}
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      </Modal>
    </div>
  );
}
