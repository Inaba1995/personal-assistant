import { useLocation, useNavigate } from 'react-router-dom';
import type { Settings, User } from '@assistant/shared';
import { useLogout } from '../api/hooks';
import { QuickSearch } from './QuickSearch';
import { ThemeToggle } from './ThemeToggle';
import { navTitle } from './nav';

interface TopbarProps {
  user: User | undefined;
  settings: Settings | undefined;
  onMenuClick: () => void;
}

export function Topbar({ user, settings, onMenuClick }: TopbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();

  const handleLogout = async (): Promise<void> => {
    await logout.mutateAsync();
    navigate('/login');
  };

  const workHours =
    settings ? `${settings.workHoursStart}–${settings.workHoursEnd}` : '—';

  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Открыть меню"
        className="shrink-0 rounded-lg border border-slate-300 p-2 dark:border-slate-700 lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
          <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div className="min-w-0 flex-1 md:flex-none">
        <div className="truncate text-sm font-semibold">{navTitle(location.pathname)}</div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          Рабочие часы: {workHours}
          {settings ? ` (${settings.timezone})` : ''}
        </div>
      </div>

      {/* На мобильном поиск переносится на отдельную строку (order-last). */}
      <QuickSearch className="relative order-last w-full min-w-0 md:order-none md:w-auto md:max-w-md md:flex-1" />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <ThemeToggle />

        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium leading-tight">{user?.name ?? '…'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={logout.isPending}
          className="btn-secondary px-2.5! py-2!"
          title="Выйти"
          aria-label="Выйти из аккаунта"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M12 6V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2M9 10h9m0 0-3-3m3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
