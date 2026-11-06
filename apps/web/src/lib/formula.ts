/**
 * Оценка формул таблицы: SUM / AVG / COUNT по диапазонам ячеек (A1:A5) и ссылкам.
 * Поддерживает вложенные формулы (ячейка диапазона может сама быть формулой).
 */

const RANGE_RE = /^([A-Z]{1,3}\d{1,4}):([A-Z]{1,3}\d{1,4})$/i;
const FUNC_RE = /^(SUM|AVG|AVERAGE|COUNT)\((.+)\)$/i;

export function colToIndex(col: string): number {
  let result = 0;
  for (const char of col.toUpperCase()) {
    result = result * 26 + (char.charCodeAt(0) - 64);
  }
  return result - 1;
}

export function indexToCol(index: number): string {
  let n = index + 1;
  let col = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    col = String.fromCharCode(65 + rem) + col;
    n = Math.floor((n - 1) / 26);
  }
  return col;
}

export function normalizeRef(ref: string): string {
  return ref.replace(/\$/g, '').toUpperCase();
}

function toNumber(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellValue(
  ref: string,
  getRaw: (ref: string) => string | undefined,
  depth: number,
): string {
  const raw = getRaw(normalizeRef(ref));
  if (raw === undefined || raw === null) return '';
  if (raw.startsWith('=')) return evaluateCell(raw, getRaw, depth + 1);
  return raw;
}

function collectRange(
  from: string,
  to: string,
  getRaw: (ref: string) => string | undefined,
  depth: number,
): number[] {
  const a = /^([A-Z]+)(\d+)$/i.exec(normalizeRef(from));
  const b = /^([A-Z]+)(\d+)$/i.exec(normalizeRef(to));
  if (!a || !b) return [];

  const colStart = Math.min(colToIndex(a[1] ?? 'A'), colToIndex(b[1] ?? 'A'));
  const colEnd = Math.max(colToIndex(a[1] ?? 'A'), colToIndex(b[1] ?? 'A'));
  const rowStart = Math.min(Number(a[2]), Number(b[2]));
  const rowEnd = Math.max(Number(a[2]), Number(b[2]));

  const numbers: number[] = [];
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      const value = toNumber(cellValue(`${indexToCol(col)}${row}`, getRaw, depth));
      if (value !== null) numbers.push(value);
    }
  }
  return numbers;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/**
 * Вычисляет ячейку: обычное значение → как есть, формула → результат.
 * Возвращает строку для отображения; '#ERROR' при некорректной формуле.
 */
export function evaluateCell(
  raw: string,
  getRaw: (ref: string) => string | undefined,
  depth = 0,
): string {
  if (!raw.startsWith('=')) return raw;
  if (depth > 8) return '#REF!';

  const expr = raw.slice(1).trim();
  if (expr === '') return '';

  const func = FUNC_RE.exec(expr);
  if (func) {
    const name = (func[1] ?? '').toUpperCase();
    const args = (func[2] ?? '')
      .split(',')
      .map((arg) => arg.trim())
      .filter(Boolean);

    const numbers: number[] = [];
    for (const arg of args) {
      const range = RANGE_RE.exec(arg.replace(/\$/g, ''));
      if (range) {
        numbers.push(...collectRange(range[1] ?? '', range[2] ?? '', getRaw, depth));
        continue;
      }
      const single = toNumber(cellValue(arg, getRaw, depth));
      if (single !== null) numbers.push(single);
    }

    if (name === 'COUNT') return String(numbers.length);
    if (numbers.length === 0) return '0';
    const sum = numbers.reduce((acc, value) => acc + value, 0);
    if (name === 'AVG' || name === 'AVERAGE') return String(round(sum / numbers.length));
    return String(round(sum));
  }

  // Одиночная ссылка: =A1
  const single = /^([A-Z]{1,3}\d{1,4})$/i.exec(expr.replace(/\$/g, ''));
  if (single) return cellValue(single[1] ?? '', getRaw, depth);

  return '#ERROR';
}

export function isFormula(value: string): boolean {
  return value.startsWith('=');
}
