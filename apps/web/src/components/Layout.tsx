import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDashboard, useMe, useSettings } from '../api/hooks';
import { Loader } from './Loader';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Основной layout: сайдбар + верхняя панель + контент. */
export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const me = useMe();
  const settings = useSettings();
  const dashboard = useDashboard();

  // Закрываем мобильное меню при переходе.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const reminders = dashboard.data?.reminders.length ?? 0;
  const unreadComments = dashboard.data?.counts.unreadComments ?? 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        deadlinesBadge={reminders}
        commentsBadge={unreadComments}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={me.data}
          settings={settings.data}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 md:p-6">
          {me.isPending ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader label="Загрузка…" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
