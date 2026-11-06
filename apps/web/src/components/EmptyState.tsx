import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}

export function EmptyState({ title, description, action, icon = '📭' }: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
