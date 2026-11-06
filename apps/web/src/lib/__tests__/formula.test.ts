import { describe, expect, it } from 'vitest';
import { evaluateCell, indexToCol, colToIndex, isFormula } from '../formula';

const grid: Record<string, string> = {
  A1: '10',
  A2: '20',
  A3: '30',
  B1: '5',
  B2: '15',
  C1: '=SUM(A1:A3)',
  C2: '=AVG(A1:A3)',
  C3: '=COUNT(A1:B2)',
  C4: '=SUM(A1:A3, B1:B2)',
  C5: '=C1',
};

const getRaw = (ref: string): string | undefined => grid[ref];

describe('formula: SUM / AVG / COUNT', () => {
  it('считает SUM по диапазону', () => {
    expect(evaluateCell('=SUM(A1:A3)', getRaw)).toBe('60');
  });

  it('считает AVG по диапазону', () => {
    expect(evaluateCell('=AVG(A1:A3)', getRaw)).toBe('20');
  });

  it('COUNT считает только числовые ячейки диапазона', () => {
    // A1:B2 — это 4 ячейки (A3 в диапазон не входит)
    expect(evaluateCell('=COUNT(A1:B2)', getRaw)).toBe('4');
    expect(evaluateCell('=COUNT(A1:A3)', getRaw)).toBe('3');
  });

  it('поддерживает несколько аргументов и вложенные ссылки', () => {
    expect(evaluateCell('=SUM(A1:A3, B1:B2)', getRaw)).toBe('80');
    expect(evaluateCell('=C1', getRaw)).toBe('60');
  });

  it('возвращает исходное значение для не-формул и #ERROR для мусора', () => {
    expect(evaluateCell('просто текст', getRaw)).toBe('просто текст');
    expect(evaluateCell('=НЕТФУНКЦИИ(1)', getRaw)).toBe('#ERROR');
    expect(isFormula('=SUM(A1)')).toBe(true);
    expect(isFormula('123')).toBe(false);
  });

  it('конвертирует буквенные обозначения столбцов', () => {
    expect(colToIndex('A')).toBe(0);
    expect(colToIndex('AA')).toBe(26);
    expect(indexToCol(0)).toBe('A');
    expect(indexToCol(27)).toBe('AB');
  });
});
