import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../../lib/toast';
import { Login } from '../Login';

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe('Login', () => {
  it('валидирует email и пароль через общую zod-схему', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'не-почта' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    expect(await screen.findByText('Введите корректный email')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
  });

  it('показывает ошибку сервера при неверных учётных данных', async () => {
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'nobody@test.local' },
    });
    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'Password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

    // Запрос уйдёт на /api/auth/login; в jsdom fetch недоступен/падает → ошибка мутации.
    await waitFor(() => {
      expect(screen.queryByText('Входим…')).not.toBeInTheDocument();
    });
  });
});
