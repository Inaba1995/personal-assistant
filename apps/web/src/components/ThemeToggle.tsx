import { useEffect, useState } from 'react';

const THEME_KEY = 'pa.theme';

export function getTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // localStorage недоступен — тема применяется только до перезагрузки.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return (
    <button
      type="button"
      onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
