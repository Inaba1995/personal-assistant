import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '@assistant/shared';
import { useRegister } from '../api/hooks';

type FieldErrors = { email?: string; password?: string; name?: string };

export function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const register = useRegister();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email') errors.email = issue.message;
        if (field === 'password') errors.password = issue.message;
        if (field === 'name') errors.name = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    register.mutate(parsed.data, { onSuccess: () => navigate('/', { replace: true }) });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="card w-full max-w-md p-6 md:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold">Регистрация</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ваши данные увидите только вы
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="reg-name">
              Имя
            </label>
            <input
              id="reg-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Иван Петров"
            />
            {fieldErrors.name ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              className="input"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="you@example.com"
            />
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.email}</p>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="reg-password">
              Пароль (минимум 8 символов)
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              className="input"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="••••••••"
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{fieldErrors.password}</p>
            ) : null}
          </div>

          {register.isError ? (
            <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {register.error.message}
            </div>
          ) : null}

          <button type="submit" className="btn-primary w-full" disabled={register.isPending}>
            {register.isPending ? 'Создаём аккаунт…' : 'Создать аккаунт'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}
