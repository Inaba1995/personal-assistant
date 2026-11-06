/** Форматирование дат/времени для UI (русская локаль). */

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', DATE_OPTIONS);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', DATE_TIME_OPTIONS);
}

/** «сегодня», «завтра», «просрочено на N дн.» или дата. */
export function formatRelativeDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOf = (d: Date): number => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };
  const diffDays = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (diffDays === 0) return 'сегодня';
  if (diffDays === 1) return 'завтра';
  if (diffDays === -1) return 'вчера';
  if (diffDays < 0) return `просрочено на ${Math.abs(diffDays)} дн.`;
  return formatDate(iso);
}

export function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

/** Значение для <input type="date">. */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price);
}
