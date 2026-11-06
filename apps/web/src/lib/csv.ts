import { downloadFile } from '../api/client';

/** Экспорт таблицы в CSV (с BOM для корректного открытия в Excel). */
export function toCsv(columns: string[], rows: string[][]): string {
  const escape = (value: string): string => {
    const needsQuotes = /[",;\n\r]/.test(value);
    if (!needsQuotes) return value;
    return `"${value.replace(/"/g, '""')}"`;
  };

  const lines = [columns.map(escape).join(';')];
  for (const row of rows) {
    lines.push(row.map(escape).join(';'));
  }
  // BOM + CRLF: стандарт для Excel.
  return `\uFEFF${lines.join('\r\n')}`;
}

export function downloadCsv(filename: string, columns: string[], rows: string[][]): void {
  const safeName = filename.replace(/[\\/:*?"<>|]/g, '_') || 'table';
  downloadFile(`${safeName}.csv`, toCsv(columns, rows), 'text/csv');
}
