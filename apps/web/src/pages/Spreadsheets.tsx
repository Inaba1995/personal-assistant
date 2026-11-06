import { useMemo, useState } from 'react';
import type { Spreadsheet, SpreadsheetCreateInput, SpreadsheetColumn } from '@assistant/shared';
import { spreadsheetCreateSchema } from '@assistant/shared';
import { useCrudAll, useCrudMutations } from '../api/hooks';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { PageHeader } from '../components/PageHeader';
import { downloadCsv } from '../lib/csv';
import { evaluateCell, isFormula } from '../lib/formula';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

const newColumnName = (columns: SpreadsheetColumn[]): string =>
  `Столбец ${columns.length + 1}`;

export function Spreadsheets() {
  const { data, isLoading } = useCrudAll<Spreadsheet>('spreadsheets', 'spreadsheets', {
    sort: '-updatedAt',
  });
  const mutations = useCrudMutations<SpreadsheetCreateInput, Spreadsheet>({
    key: 'spreadsheets',
    resource: 'spreadsheets',
    createMessage: 'Таблица создана',
    updateMessage: 'Таблица сохранена',
    deleteMessage: 'Таблица удалена',
  });
  const toast = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SpreadsheetCreateInput | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const items = data?.items ?? [];
  const selected = items.find((item) => item.id === selectedId) ?? null;

  const selectSheet = (sheet: Spreadsheet): void => {
    setSelectedId(sheet.id);
    setDraft({ name: sheet.name, columns: sheet.columns, rows: sheet.rows });
    setDirty(false);
    setSelectedCell(null);
    setEditingCell(null);
  };

  const columns = draft?.columns ?? [];
  const rows = draft?.rows ?? [];

  const getRaw = useMemo(() => {
    const current = draft;
    return (ref: string): string | undefined => {
      if (!current) return undefined;
      const match = /^([A-Z]{1,3})(\d{1,4})$/.exec(ref);
      if (!match) return undefined;
      const colLetters = match[1] ?? '';
      const rowNumber = Number(match[2]);
      let colIndex = 0;
      for (const char of colLetters) colIndex = colIndex * 26 + (char.charCodeAt(0) - 64);
      colIndex -= 1;
      const rowIndex = rowNumber - 1;
      if (rowIndex < 0 || rowIndex >= current.rows.length) return undefined;
      return current.rows[rowIndex]?.[colIndex];
    };
  }, [draft]);

  const patch = (next: Partial<SpreadsheetCreateInput>): void => {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
    setDirty(true);
  };

  const setCellValue = (rowIndex: number, colIndex: number, value: string): void => {
    if (!draft) return;
    const nextRows = draft.rows.map((row, i) => {
      if (i !== rowIndex) return row;
      const copy = [...row];
      while (copy.length <= colIndex) copy.push('');
      copy[colIndex] = value;
      return copy;
    });
    patch({ rows: nextRows });
  };

  const addRow = (): void => {
    patch({ rows: [...rows, columns.map(() => '')] });
  };

  const removeRow = (index: number): void => {
    patch({ rows: rows.filter((_, i) => i !== index) });
    setSelectedCell(null);
    setEditingCell(null);
  };

  const addColumn = (): void => {
    patch({
      columns: [...columns, { name: newColumnName(columns) }],
      rows: rows.map((row) => [...row, '']),
    });
  };

  const removeColumn = (index: number): void => {
    if (columns.length <= 1) {
      toast.error('Нужен хотя бы один столбец');
      return;
    }
    patch({
      columns: columns.filter((_, i) => i !== index),
      rows: rows.map((row) => row.filter((_, i) => i !== index)),
    });
    setSelectedCell(null);
    setEditingCell(null);
  };

  const renameColumn = (index: number, name: string): void => {
    patch({ columns: columns.map((column, i) => (i === index ? { ...column, name } : column)) });
  };

  const handleSave = (): void => {
    if (!selected || !draft) return;
    const parsed = spreadsheetCreateSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте данные таблицы');
      return;
    }
    mutations.update.mutate({ id: selected.id, data: parsed.data });
    setDirty(false);
  };

  const handleCreate = (): void => {
    mutations.create.mutate({
      name: `Таблица ${items.length + 1}`,
      columns: [{ name: 'Столбец 1' }, { name: 'Столбец 2' }],
      rows: [['', '']],
    });
  };

  const handleDelete = (): void => {
    if (!selected) return;
    if (!window.confirm(`Удалить таблицу «${selected.name}»?`)) return;
    mutations.remove.mutate(selected.id, {
      onSuccess: () => {
        setSelectedId(null);
        setDraft(null);
      },
    });
  };

  const handleExport = (): void => {
    if (!draft) return;
    downloadCsv(draft.name, draft.columns.map((column) => column.name), draft.rows);
    toast.success('CSV скачан');
  };

  if (isLoading) return <PageLoader label="Загрузка таблиц…" />;

  const selectedRaw =
    selectedCell && draft && draft.rows[selectedCell.row] !== undefined
      ? (draft.rows[selectedCell.row]?.[selectedCell.col] ?? '')
      : '';
  const selectedComputed =
    selectedCell && selectedRaw
      ? evaluateCell(
          selectedRaw,
          (ref) => getRaw(ref),
        )
      : selectedRaw;

  return (
    <div>
      <PageHeader
        title="Таблицы"
        description="Редактируемая сетка, формулы SUM / AVG / COUNT (например, =SUM(B1:B10)) и экспорт CSV."
        actions={
          <>
            <button type="button" className="btn-secondary" onClick={handleCreate}>
              + Новая таблица
            </button>
            {draft ? (
              <>
                <button type="button" className="btn-secondary" onClick={handleExport}>
                  ⬇ Экспорт CSV
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={mutations.update.isPending || !dirty}
                >
                  {mutations.update.isPending ? 'Сохранение…' : dirty ? 'Сохранить •' : 'Сохранено'}
                </button>
              </>
            ) : null}
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Таблиц пока нет"
          description="Создайте таблицу: строки, столбцы, формулы и экспорт в CSV."
          icon="📊"
          action={
            <button type="button" className="btn-primary" onClick={handleCreate}>
              Создать таблицу
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="card max-h-44 space-y-1.5 overflow-y-auto p-3 lg:max-h-[70vh]">
            {items.map((sheet) => (
              <button
                key={sheet.id}
                type="button"
                onClick={() => selectSheet(sheet)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${ selectedId === sheet.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800' }`}
              >
                <div className="truncate text-sm font-medium">{sheet.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {sheet.columns.length} кол. · {sheet.rows.length} стр. · {formatDateTime(sheet.updatedAt)}
                </div>
              </button>
            ))}
          </aside>

          <section className="card min-w-0 p-4">
            {!draft || !selected ? (
              <EmptyState
                title="Выберите таблицу"
                description="Нажмите на таблицу слева или создайте новую."
                icon="🗂️"
              />
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1">
                    <label className="label" htmlFor="sheet-name">
                      Название
                    </label>
                    <input
                      id="sheet-name"
                      className="input"
                      value={draft.name}
                      onChange={(event) => patch({ name: event.target.value })}
                    />
                  </div>
                  <button type="button" className="btn-secondary" onClick={addRow}>
                    + Строка
                  </button>
                  <button type="button" className="btn-secondary" onClick={addColumn}>
                    + Столбец
                  </button>
                  <button type="button" className="btn-danger py-2! text-xs" onClick={handleDelete}>
                    Удалить таблицу
                  </button>
                </div>

                {/* Формула-бар */}
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-950">
                  <span className="min-w-14 rounded bg-white px-2 py-1 text-xs font-mono font-semibold shadow-sm dark:bg-slate-800">
                    {selectedCell
                      ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}`
                      : '—'}
                  </span>
                  <input
                    className="flex-1 bg-transparent font-mono text-sm outline-none"
                    value={selectedRaw}
                    placeholder="Выберите ячейку; формула начинается с ="
                    disabled={!selectedCell}
                    onChange={(event) => {
                      if (selectedCell) setCellValue(selectedCell.row, selectedCell.col, event.target.value);
                    }}
                    aria-label="Значение ячейки"
                  />
                  {isFormula(selectedRaw) ? (
                    <span className="rounded bg-indigo-100 px-2 py-1 font-mono text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      = {selectedComputed}
                    </span>
                  ) : null}
                </div>

                <div className="max-h-[55vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="w-10 border-b border-r border-slate-200 bg-slate-50 p-0 dark:border-slate-700 dark:bg-slate-950" />
                        {columns.map((column, colIndex) => (
                          <th
                            key={colIndex}
                            className="border-b border-r border-slate-200 bg-slate-50 p-0 dark:border-slate-700 dark:bg-slate-950"
                          >
                            <div className="flex items-center gap-1 px-2 py-1.5">
                              <input
                                className="w-full min-w-20 bg-transparent text-xs font-semibold uppercase tracking-wide outline-none"
                                value={column.name}
                                onChange={(event) => renameColumn(colIndex, event.target.value)}
                                aria-label={`Название столбца ${colIndex + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeColumn(colIndex)}
                                className="text-slate-400 hover:text-rose-500"
                                aria-label={`Удалить столбец ${column.name}`}
                              >
                                ×
                              </button>
                            </div>
                          </th>
                        ))}
                        <th className="w-10 border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={columns.length + 2}
                            className="p-6 text-center text-slate-400"
                          >
                            Пусто — нажмите «+ Строка»
                          </td>
                        </tr>
                      ) : (
                        rows.map((row, rowIndex) => (
                          <tr key={rowIndex} className="group">
                            <td className="border-b border-r border-slate-200 bg-slate-50 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-950">
                              {rowIndex + 1}
                            </td>
                            {columns.map((_, colIndex) => {
                              const cellKey = `${rowIndex}-${colIndex}`;
                              const raw = row[colIndex] ?? '';
                              const isEditing = editingCell === cellKey;
                              const isSelected =
                                selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
                              const computed = isFormula(raw)
                                ? evaluateCell(raw, (ref) => getRaw(ref))
                                : raw;
                              return (
                                <td
                                  key={colIndex}
                                  className={`border-b border-r border-slate-200 p-0 dark:border-slate-700 ${ isSelected ? 'outline outline-2 -outline-offset-2 outline-indigo-500' : '' }`}
                                  onClick={() => {
                                    setSelectedCell({ row: rowIndex, col: colIndex });
                                    setEditingCell(cellKey);
                                  }}
                                >
                                  {isEditing ? (
                                    <input
                                      autoFocus
                                      className="w-full min-w-28 px-2 py-1.5 font-mono text-sm outline-none"
                                      value={raw}
                                      onChange={(event) =>
                                        setCellValue(rowIndex, colIndex, event.target.value)
                                      }
                                      onBlur={() => setEditingCell(null)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      aria-label={`Ячейка ${rowIndex + 1}, ${colIndex + 1}`}
                                    />
                                  ) : (
                                    <div className="min-h-8 min-w-28 cursor-text px-2 py-1.5 font-mono text-sm">
                                      {computed}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border-b border-slate-200 text-center dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => removeRow(rowIndex)}
                                className="px-1 text-slate-300 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                                aria-label={`Удалить строку ${rowIndex + 1}`}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Формулы: <code>=SUM(B1:B10)</code>, <code>=AVG(B1:B10)</code>,{' '}
                  <code>=COUNT(A1:A20)</code>. Поддерживаются ссылки на ячейки и вложенные формулы.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
