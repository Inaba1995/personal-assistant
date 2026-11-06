import { Link } from 'react-router-dom';
import type { Task } from '@assistant/shared';
import { useCrudMutations, useDashboard, useMe } from '../api/hooks';
import type { TaskCreateInput } from '@assistant/shared';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { PageHeader } from '../components/PageHeader';
import { PriorityBadge } from '../components/Badges';
import { formatDateTime, formatRelativeDay, isOverdue } from '../lib/format';

const GREETING = (): string => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
};

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string | number;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent ?? ''}`}>{value}</div>
      {hint ? <div className="mt-0.5 text-xs text-slate-400">{hint}</div> : null}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  busy,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  busy: boolean;
}) {
  const done = task.status === 'DONE';
  const overdue = !done && isOverdue(task.dueDate);
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border p-3 ${ overdue ? 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40' : 'border-slate-200 dark:border-slate-700' }`}
    >
      <input
        type="checkbox"
        checked={done}
        disabled={busy}
        onChange={() => onToggle(task)}
        aria-label={`Отметить «${task.title}»`}
        className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
      />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${done ? 'line-through opacity-60' : ''}`}>
          {task.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {task.dueDate ? (
            <span className={overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}>
              📅 {formatRelativeDay(task.dueDate)}
            </span>
          ) : null}
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800"
            >
              #{tag}
            </span>
          ))}
          <PriorityBadge priority={task.priority} />
        </div>
      </div>
    </li>
  );
}

export function Dashboard() {
  const { data, isLoading, isError } = useDashboard();
  const { data: me } = useMe();
  const tasks = useCrudMutations<TaskCreateInput, Task>({
    key: 'tasks',
    resource: 'tasks',
    updateMessage: 'Статус задачи обновлён',
  });

  if (isLoading) return <PageLoader label="Загрузка сводки…" />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Не удалось загрузить сводку"
        description="Обновите страницу или войдите заново."
        icon="⚠️"
      />
    );
  }

  const toggleTask = (task: Task): void => {
    tasks.update.mutate({
      id: task.id,
      data: { status: task.status === 'DONE' ? 'TODO' : 'DONE' },
    });
  };

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const reminders = data.reminders;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${GREETING()}, ${me?.name ?? 'коллега'}!`}
        description={`${today.charAt(0).toUpperCase()}${today.slice(1)}`}
        actions={
          <>
            <Link to="/tasks" className="btn-primary">
              Новая задача
            </Link>
            <Link to="/documents" className="btn-secondary">
              Новое письмо
            </Link>
          </>
        }
      />

      {/* Баннер напоминаний о дедлайнах */}
      {reminders.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/40">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <span aria-hidden>⏰</span> Напоминания о дедлайнах
          </div>
          <ul className="space-y-1">
            {reminders.slice(0, 5).map((deadline) => {
              const overdue = isOverdue(deadline.date);
              return (
                <li key={deadline.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`font-medium ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-800 dark:text-amber-200'}`}
                  >
                    {deadline.title}
                  </span>
                  <span className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    {formatRelativeDay(deadline.date)} · {formatDateTime(deadline.date)}
                  </span>
                </li>
              );
            })}
          </ul>
          {reminders.length > 5 ? (
            <Link to="/deadlines" className="mt-2 inline-block text-xs font-medium text-amber-700 underline dark:text-amber-300">
              Все напоминания ({reminders.length})
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Статистика */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Задачи на сегодня"
          value={`${data.today.done}/${data.today.total}`}
          hint={`${data.today.inProgress} в работе`}
        />
        <StatCard
          label="Просрочено"
          value={data.today.overdue}
          accent={data.today.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : ''}
          hint="задач с истёкшим сроком"
        />
        <StatCard
          label="Дедлайны"
          value={data.counts.deadlines}
          hint={`${data.upcomingDeadlines.length} на неделе`}
        />
        <StatCard
          label="Новые комментарии"
          value={data.counts.unreadComments}
          accent={data.counts.unreadComments > 0 ? 'text-sky-600 dark:text-sky-400' : ''}
          hint="без ответа"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Задачи на сегодня */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Задачи на сегодня
            </h2>
            <Link to="/tasks" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Планировщик →
            </Link>
          </div>
          {data.tasksDueToday.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              На сегодня задач с дедлайном нет 🎉
            </p>
          ) : (
            <ul className="space-y-2">
              {data.tasksDueToday.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  busy={tasks.update.isPending}
                />
              ))}
            </ul>
          )}

          {data.overdueTasks.length > 0 ? (
            <>
              <h3 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-rose-500">
                Просроченные ({data.overdueTasks.length})
              </h3>
              <ul className="space-y-2">
                {data.overdueTasks.slice(0, 5).map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    busy={tasks.update.isPending}
                  />
                ))}
              </ul>
            </>
          ) : null}
        </section>

        {/* Ближайшие дедлайны */}
        <section className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ближайшие дедлайны
            </h2>
            <Link to="/deadlines" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Календарь →
            </Link>
          </div>
          {data.upcomingDeadlines.length === 0 && data.overdueDeadlines.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              Дедлайнов на ближайшую неделю нет
            </p>
          ) : (
            <ul className="space-y-2">
              {data.overdueDeadlines.slice(0, 3).map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm dark:border-rose-800 dark:bg-rose-950/40"
                >
                  <span className="min-w-0 truncate font-medium">{deadline.title}</span>
                  <span className="shrink-0 text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {formatRelativeDay(deadline.date)}
                  </span>
                </li>
              ))}
              {data.upcomingDeadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
                >
                  <span className="min-w-0 truncate font-medium">{deadline.title}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {formatRelativeDay(deadline.date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Быстрые действия */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Быстрые действия
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { to: '/tasks', icon: '🗂️', label: 'Планировщик', hint: 'Kanban-задачи' },
            { to: '/ai', icon: '✨', label: 'Спросить ИИ', hint: 'Выжимка, план, письмо' },
            { to: '/search', icon: '🔍', label: 'Анализ текста', hint: 'Выжимка с источниками' },
            { to: '/comments', icon: '💬', label: 'Ответы', hint: `${data.counts.unreadComments} без ответа` },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="card flex items-center gap-3 p-4 transition-colors hover:border-indigo-400 dark:hover:border-indigo-600"
            >
              <span className="text-2xl" aria-hidden>
                {action.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{action.label}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {action.hint}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
