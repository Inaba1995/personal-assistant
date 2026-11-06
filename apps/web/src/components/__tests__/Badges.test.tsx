import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PriorityBadge, TaskStatusBadge } from '../Badges';

describe('Badges', () => {
  it('PriorityBadge показывает русскую подпись приоритета', () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText('Высокий')).toBeInTheDocument();

    render(<PriorityBadge priority="LOW" />);
    expect(screen.getByText('Низкий')).toBeInTheDocument();
  });

  it('TaskStatusBadge показывает подпись статуса', () => {
    render(<TaskStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('В работе')).toBeInTheDocument();

    render(<TaskStatusBadge status="DONE" />);
    expect(screen.getByText('Готово')).toBeInTheDocument();
  });
});
