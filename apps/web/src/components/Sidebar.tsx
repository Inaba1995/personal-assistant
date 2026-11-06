import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './nav';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  deadlinesBadge: number;
  commentsBadge: number;
}

export function Sidebar({ open, onClose, deadlinesBadge, commentsBadge }: SidebarProps) {
  const badgeFor = (badge?: 'deadlines' | 'comments'): number => {
    if (badge === 'deadlines') return deadlinesBadge;
    if (badge === 'comments') return commentsBadge;
    return 0;
  };

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          role="presentation"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 transform flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${ open ? 'translate-x-0' : '-translate-x-full' }`}
      >
        <div className="flex items-center gap-2 px-4 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            ПА
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold">Ассистент</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">офисная рутина</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {NAV_ITEMS.map((item) => {
            const badge = badgeFor(item.badge);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                <span aria-hidden className="text-base leading-none">
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {badge > 0 ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? '99+' : badge}
                  </span>
                ) : (
                  <span className={`h-2 w-2 rounded-full ${item.dot}`} aria-hidden />
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-400 dark:border-slate-800">
          Данные видит только владелец аккаунта
        </div>
      </aside>
    </>
  );
}
