import type { ReactNode } from 'react';
import type { TaskPriority, TaskStatus } from '@assistant/shared';

const PRIORITY_META: Record<TaskPriority, { label: string; className: string }> = {
  LOW: {
    label: 'Низкий',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  MEDIUM: {
    label: 'Средний',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  HIGH: {
    label: 'Высокий',
    className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
};

const STATUS_META: Record<TaskStatus, { label: string; className: string }> = {
  BACKLOG: {
    label: 'Бэклог',
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
  TODO: {
    label: 'К выполнению',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  IN_PROGRESS: {
    label: 'В работе',
    className: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  },
  DONE: {
    label: 'Готово',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
};

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.MEDIUM;
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.BACKLOG;
  return <Badge className={meta.className}>{meta.label}</Badge>;
}

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS_META[status]?.label ?? status;
}
