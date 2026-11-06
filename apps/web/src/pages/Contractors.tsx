import { useState } from 'react';
import type { Contractor, ContractorCreateInput, ContractorStatus } from '@assistant/shared';
import { contractorCreateSchema, contractorStatusSchema } from '@assistant/shared';
import { useCrudAll, useCrudMutations } from '../api/hooks';
import { Badge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../lib/format';

const FLOW: ContractorStatus[] = ['FOUND', 'CONTACTED', 'SHORTLISTED', 'REJECTED'];

const STATUS_META: Record<ContractorStatus, { label: string; dot: string; badge: string }> = {
  FOUND: {
    label: 'Найдены',
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  CONTACTED: {
    label: 'Связались',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  SHORTLISTED: {
    label: 'Короткий список',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'Отклонены',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
};

interface FormState {
  name: string;
  contact: string;
  skills: string;
  status: ContractorStatus;
  notes: string;
}

const emptyForm: FormState = { name: '', contact: '', skills: '', status: 'FOUND', notes: '' };

export function Contractors() {
  const { data, isLoading } = useCrudAll<Contractor>('contractors', 'contractors', { sort: 'name' });
  const mutations = useCrudMutations<ContractorCreateInput, Contractor>({
    key: 'contractors',
    resource: 'contractors',
    createMessage: 'Исполнитель добавлен',
    updateMessage: 'Карточка обновлена',
    deleteMessage: 'Исполнитель удалён',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const openCreate = (status: ContractorStatus = 'FOUND'): void => {
    setEditing(null);
    setForm({ ...emptyForm, status });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (contractor: Contractor): void => {
    setEditing(contractor);
    setForm({
      name: contractor.name,
      contact: contractor.contact,
      skills: contractor.skills.join(', '),
      status: contractor.status,
      notes: contractor.notes,
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const parsed = contractorCreateSchema.safeParse({
      name: form.name,
      contact: form.contact,
      skills: form.skills
        .split(',')
        .map((skill) => skill.trim())
        .filter(Boolean),
      status: form.status,
      notes: form.notes,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    if (editing) {
      mutations.update.mutate(
        { id: editing.id, data: parsed.data },
        { onSuccess: () => setModalOpen(false) },
      );
    } else {
      mutations.create.mutate(parsed.data, { onSuccess: () => setModalOpen(false) });
    }
  };

  const move = (contractor: Contractor, direction: -1 | 1): void => {
    const index = FLOW.indexOf(contractor.status);
    const target = index + direction;
    if (target < 0 || target >= FLOW.length) return;
    const next = FLOW[target];
    if (!next) return;
    mutations.update.mutate({ id: contractor.id, data: { status: next } });
  };

  if (isLoading) return <PageLoader label="Загрузка исполнителей…" />;

  return (
    <div>
      <PageHeader
        title="Исполнители"
        description="Воронка FOUND → CONTACTED → SHORTLISTED → REJECTED, навыки и заметки."
        actions={
          <button type="button" className="btn-primary" onClick={() => openCreate()}>
            + Исполнитель
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Исполнителей пока нет"
          description="Добавьте кандидатов и проводите их по воронке."
          icon="👷"
          action={
            <button type="button" className="btn-primary" onClick={() => openCreate()}>
              Добавить первого
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {FLOW.map((status, columnIndex) => {
            const columnItems = items.filter((item) => item.status === status);
            const meta = STATUS_META[status];
            return (
              <section key={status} className="flex flex-col rounded-xl bg-slate-100/70 p-2 dark:bg-slate-900/60">
                <header className="mb-2 flex items-center gap-2 px-1 py-1">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
                  <h2 className="text-sm font-semibold">{meta.label}</h2>
                  <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
                    {columnItems.length}
                  </span>
                </header>

                <div className="flex-1 space-y-2">
                  {columnItems.map((contractor) => (
                    <article key={contractor.id} className="card p-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="min-w-0 text-sm font-semibold">{contractor.name}</h3>
                        <button
                          type="button"
                          className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          onClick={() => openEdit(contractor)}
                          aria-label={`Редактировать ${contractor.name}`}
                        >
                          ✏️
                        </button>
                      </div>

                      {contractor.contact ? (
                        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {contractor.contact}
                        </div>
                      ) : null}

                      {contractor.skills.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {contractor.skills.map((skill) => (
                            <Badge key={skill} className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      {contractor.notes ? (
                        <p className="mt-2 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">
                          {contractor.notes}
                        </p>
                      ) : null}

                      <div className="mt-2 text-[11px] text-slate-400">
                        {formatDateTime(contractor.createdAt)}
                      </div>

                      <div className="mt-2 flex items-center gap-1">
                        <button
                          type="button"
                          className="btn-secondary flex-1 px-1.5! py-1! text-xs"
                          onClick={() => move(contractor, -1)}
                          disabled={columnIndex === 0}
                          aria-label="Переместить назад"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="btn-secondary flex-1 px-1.5! py-1! text-xs"
                          onClick={() => move(contractor, 1)}
                          disabled={columnIndex === FLOW.length - 1}
                          aria-label="Переместить вперёд"
                        >
                          →
                        </button>
                        <button
                          type="button"
                          className="btn-danger px-1.5! py-1! text-xs"
                          onClick={() => {
                            if (window.confirm(`Удалить «${contractor.name}»?`)) {
                              mutations.remove.mutate(contractor.id);
                            }
                          }}
                          aria-label="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </article>
                  ))}

                  {columnItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-xs text-slate-400 dark:border-slate-700">
                      Пусто
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="btn-secondary mt-2 py-1.5! text-xs"
                  onClick={() => openCreate(status)}
                >
                  + Добавить
                </button>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? 'Редактировать исполнителя' : 'Новый исполнитель'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="label" htmlFor="contractor-name">
              Имя / компания *
            </label>
            <input
              id="contractor-name"
              className="input"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Алексей Ковалёв"
              autoFocus
            />
            {errors.name ? <p className="mt-1 text-xs text-rose-600">{errors.name}</p> : null}
          </div>

          <div>
            <label className="label" htmlFor="contractor-contact">
              Контакт
            </label>
            <input
              id="contractor-contact"
              className="input"
              value={form.contact}
              onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))}
              placeholder="email или телефон"
            />
          </div>

          <div>
            <label className="label" htmlFor="contractor-skills">
              Навыки (через запятую)
            </label>
            <input
              id="contractor-skills"
              className="input"
              value={form.skills}
              onChange={(event) => setForm((prev) => ({ ...prev, skills: event.target.value }))}
              placeholder="Дизайн, Figma"
            />
          </div>

          <div>
            <label className="label" htmlFor="contractor-status">
              Статус воронки
            </label>
            <select
              id="contractor-status"
              className="input"
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, status: event.target.value as ContractorStatus }))
              }
            >
              {contractorStatusSchema.options.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="contractor-notes">
              Заметки
            </label>
            <textarea
              id="contractor-notes"
              className="input min-h-24"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Договорённости, впечатления, следующий шаг…"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary" disabled={mutations.create.isPending || mutations.update.isPending}>
              {editing ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
