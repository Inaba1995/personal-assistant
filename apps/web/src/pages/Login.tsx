import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema } from '@assistant/shared';
import { useLogin } from '../api/hooks';

export function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const login = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'email') errors.email = issue.message;
        if (issue.path[0] === 'password') errors.password = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    login.mutate(parsed.data, { onSuccess: () => navigate('/', { replace: true }) });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            ПА
          </span>
          <h1 className="text-xl font-bold">Вход в ассистента</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Задачи, документы, дедлайны и ИИ — в одном месте
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="user@demo.local"
            />
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="login-password">
              Пароль
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="••••••••"
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.password}</p>
            ) : null}
          </div>

          {login.isError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {login.error.message}
            </div>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
            {login.isPending ? 'Входим…' : 'Войти'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Нет аккаунта?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Зарегистрироваться
          </Link>
        </p>

        <div className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-center text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          Демо-доступ: <span className="font-mono">user1@demo.local</span> /{' '}
          <span className="font-mono">Demo1234!</span>
        </div>
      </div>
    </div>
  );
}
