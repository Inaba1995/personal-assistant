/** Конфигурация навигации: используется сайдбаром, топбаром и быстрым поиском. */
export interface NavItem {
  to: string;
  label: string;
  /** CSS-класс цветной точки-индикатора. */
  dot: string;
  badge?: 'deadlines' | 'comments';
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Главная', dot: 'bg-indigo-500', icon: '🏠' },
  { to: '/tasks', label: 'Планировщик', dot: 'bg-sky-500', icon: '🗂️' },
  { to: '/deadlines', label: 'Дедлайны', dot: 'bg-rose-500', icon: '⏰', badge: 'deadlines' },
  { to: '/documents', label: 'Документы', dot: 'bg-amber-500', icon: '📄' },
  { to: '/spreadsheets', label: 'Таблицы', dot: 'bg-emerald-500', icon: '📊' },
  { to: '/presentations', label: 'Презентации', dot: 'bg-violet-500', icon: '📽️' },
  { to: '/ai', label: 'ИИ-ассистент', dot: 'bg-fuchsia-500', icon: '✨' },
  { to: '/search', label: 'Поиск и анализ', dot: 'bg-cyan-500', icon: '🔍' },
  { to: '/video', label: 'Видео-резюме', dot: 'bg-teal-500', icon: '🎬' },
  { to: '/avito', label: 'Авито', dot: 'bg-orange-500', icon: '🏷️' },
  { to: '/comments', label: 'Комментарии', dot: 'bg-blue-500', icon: '💬', badge: 'comments' },
  { to: '/contractors', label: 'Исполнители', dot: 'bg-lime-600', icon: '👷' },
  { to: '/settings', label: 'Настройки', dot: 'bg-slate-500', icon: '⚙️' },
];

export function navTitle(pathname: string): string {
  if (pathname === '/') return 'Главная';
  const match = NAV_ITEMS.find((item) => item.to !== '/' && pathname.startsWith(item.to));
  return match?.label ?? 'Персональный ассистент';
}
