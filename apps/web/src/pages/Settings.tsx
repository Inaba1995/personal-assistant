import { useEffect, useState } from 'react';
import { AI_MODELS, type AiModel } from '@assistant/shared';
import { useLogout, useSaveSettings, useSettings } from '../api/hooks';
import { PageLoader } from '../components/Loader';
import { PageHeader } from '../components/PageHeader';
import { ThemeToggle } from '../components/ThemeToggle';
import { apiFetch } from '../api/client';
import { downloadJson } from '../lib/pptx';
import { useToast } from '../lib/toast';

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Asia/Yekaterinburg',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Vladivostok',
  'Europe/Kiev',
  'Europe/Minsk',
  'Asia/Almaty',
  'Asia/Tashkent',
];

const MODEL_LABELS: Record<AiModel, string> = {
  'gpt-4o-mini': 'gpt-4o-mini — быстро и дёшево (по умолчанию)',
  'gpt-4o': 'gpt-4o — максимальное качество',
  'gpt-4.1-mini': 'gpt-4.1-mini — баланс',
  'gpt-4.1': 'gpt-4.1 — длинный контекст',
};

export function Settings() {
  const { data: settings, isLoading } = useSettings();
  const save = useSaveSettings();
  const logout = useLogout();
  const toast = useToast();

  const [form, setForm] = useState({
    workHoursStart: '09:00',
    workHoursEnd: '18:00',
    timezone: 'Europe/Moscow',
    aiModel: 'gpt-4o-mini' as AiModel,
  });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      workHoursStart: settings.workHoursStart,
      workHoursEnd: settings.workHoursEnd,
      timezone: settings.timezone,
      aiModel: settings.aiModel,
    });
  }, [settings]);

  const handleSave = (event: React.FormEvent): void => {
    event.preventDefault();
    save.mutate(form);
  };

  const handleExport = async (): Promise<void> => {
    setExporting(true);
    try {
      const data = await apiFetch<unknown>('/export');
      downloadJson(`assistant-backup-${new Date().toISOString().slice(0, 10)}.json`, data);
      toast.success('Бэкап скачан');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось выгрузить данные');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !settings) return <PageLoader label="Загрузка настроек…" />;

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Настройки"
        description="Рабочие часы, часовой пояс, модель ИИ и экспорт данных."
      />

      <form onSubmit={handleSave} className="card mb-4 space-y-4 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Рабочий режим
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="hours-start">
              Начало дня
            </label>
            <input
              id="hours-start"
              type="time"
              className="input"
              value={form.workHoursStart}
              onChange={(event) => setForm((prev) => ({ ...prev, workHoursStart: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="hours-end">
              Конец дня
            </label>
            <input
              id="hours-end"
              type="time"
              className="input"
              value={form.workHoursEnd}
              onChange={(event) => setForm((prev) => ({ ...prev, workHoursEnd: event.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="timezone">
              Часовой пояс
            </label>
            <select
              id="timezone"
              className="input"
              value={form.timezone}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="ai-model">
            Модель OpenAI
          </label>
          <select
            id="ai-model"
            className="input"
            value={form.aiModel}
            onChange={(event) => setForm((prev) => ({ ...prev, aiModel: event.target.value as AiModel }))}
          >
            {AI_MODELS.map((model) => (
              <option key={model} value={model}>
                {MODEL_LABELS[model]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            Модель применяется к ИИ-ассистенту, поиску и видео-резюме.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Сохранение…' : 'Сохранить настройки'}
          </button>
        </div>
      </form>

      <section className="card mb-4 p-5">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Экспорт и бэкап
        </h2>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Выгрузите все свои данные (задачи, документы, таблицы, историю ИИ и т.д.) в один JSON-файл.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          {exporting ? 'Выгрузка…' : '⬇ Скачать JSON-бэкап'}
        </button>
      </section>

      <section className="card mb-4 border-amber-200 bg-amber-50/60 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Ключ OpenAI
        </h2>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Ключ хранится <strong>только в файле .env на сервере</strong> (переменная{' '}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">OPENAI_API_KEY</code>) и не
          редактируется из интерфейса — так исключена утечка. Без ключа разделы ИИ работают в режиме
          заглушки с инструкцией по включению.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Внешний вид и сессия
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Тема оформления:</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="btn-danger ml-auto"
            onClick={() => void logout.mutateAsync().then(() => window.location.assign('/login'))}
            disabled={logout.isPending}
          >
            Выйти из аккаунта
          </button>
        </div>
      </section>
    </div>
  );
}
