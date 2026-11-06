import { useMemo, useState } from 'react';
import type { Comment, CommentCreateInput, CommentStatus } from '@assistant/shared';
import { commentCreateSchema, commentStatusSchema } from '@assistant/shared';
import { useCrudList, useCrudMutations } from '../api/hooks';
import { Badge } from '../components/Badges';
import { EmptyState } from '../components/EmptyState';
import { PageLoader } from '../components/Loader';
import { PageHeader } from '../components/PageHeader';
import { formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';

const STATUS_META: Record<CommentStatus, { label: string; className: string }> = {
  NEW: { label: 'Новый', className: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  ANSWERED: {
    label: 'Отвечен',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
};

const REPLY_TEMPLATES: { name: string; text: string }[] = [
  { name: 'Спасибо', text: 'Спасибо за обращение! Мы скоро ответим.' },
  { name: 'Уточнение', text: 'Уточните, пожалуйста, детали — и мы поможем в тот же день.' },
  {
    name: 'Ответ на вопрос',
    text: 'Да, возможно. Напишите в личные сообщения — согласуем удобное время.',
  },
];

export function Comments() {
  const { data, isLoading } = useCrudList<Comment>('comments', 'comments', {
    limit: 100,
    sort: '-createdAt',
  });
  const mutations = useCrudMutations<CommentCreateInput, Comment>({
    key: 'comments',
    resource: 'comments',
    createMessage: 'Комментарий добавлен',
    updateMessage: 'Ответ сохранён',
    deleteMessage: 'Комментарий удалён',
  });
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<Record<string, string>>({});

  const items = data?.items ?? [];

  const platforms = useMemo(() => {
    const set = new Set(items.map((item) => item.platform));
    return [...set].sort();
  }, [items]);

  const filtered = items.filter((item) => {
    if (statusFilter && item.status !== statusFilter) return false;
    if (platformFilter && item.platform !== platformFilter) return false;
    return true;
  });

  const saveReply = (comment: Comment, markAnswered: boolean): void => {
    const reply = replies[comment.id] ?? comment.reply;
    const payload: Partial<CommentCreateInput> = { reply };
    if (markAnswered) payload.status = 'ANSWERED';
    const parsed = commentCreateSchema.partial().safeParse({
      platform: comment.platform,
      author: comment.author,
      text: comment.text,
      ...payload,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Проверьте данные');
      return;
    }
    mutations.update.mutate({ id: comment.id, data: parsed.data });
  };

  const toggleStatus = (comment: Comment): void => {
    const next: CommentStatus = comment.status === 'NEW' ? 'ANSWERED' : 'NEW';
    mutations.update.mutate({
      id: comment.id,
      data: { status: next } as Partial<CommentCreateInput>,
    });
  };

  const applyTemplate = (commentId: string): void => {
    const name = templates[commentId];
    const template = REPLY_TEMPLATES.find((item) => item.name === name);
    if (!template) return;
    const current = replies[commentId] ?? '';
    setReplies((prev) => ({
      ...prev,
      [commentId]: current ? `${current}\n${template.text}` : template.text,
    }));
  };

  const addComment = (): void => {
    mutations.create.mutate({
      platform: 'Вручную',
      author: 'Я',
      text: 'Новый комментарий (добавлен вручную)',
      reply: '',
      status: 'NEW',
    });
  };

  if (isLoading) return <PageLoader label="Загрузка комментариев…" />;

  const newCount = items.filter((item) => item.status === 'NEW').length;

  return (
    <div>
      <PageHeader
        title="Комментарии"
        description="Инбокс комментариев: ответ по шаблону и статусы NEW → ANSWERED."
        actions={
          <button type="button" className="btn-primary" onClick={addComment}>
            + Комментарий
          </button>
        }
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div>
          <label className="label" htmlFor="comment-status">
            Статус
          </label>
          <select
            id="comment-status"
            className="input w-auto!"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Все</option>
            {commentStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="comment-platform">
            Площадка
          </label>
          <select
            id="comment-platform"
            className="input w-auto!"
            value={platformFilter}
            onChange={(event) => setPlatformFilter(event.target.value)}
          >
            <option value="">Все</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          Без ответа: <strong>{newCount}</strong> · показано {filtered.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Комментариев нет"
          description="Ни одного комментария по выбранным фильтрам."
          icon="💬"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => {
            const isNew = comment.status === 'NEW';
            const draft = replies[comment.id] ?? comment.reply;
            return (
              <article
                key={comment.id}
                className={`card p-4 ${isNew ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-emerald-500'}`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {comment.platform}
                  </Badge>
                  <span className="text-sm font-semibold">{comment.author}</span>
                  <Badge className={STATUS_META[comment.status].className}>
                    {STATUS_META[comment.status].label}
                  </Badge>
                  <span className="ml-auto text-xs text-slate-400">
                    {formatDateTime(comment.createdAt)}
                  </span>
                </div>

                <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">{comment.text}</p>

                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/60">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="label mb-0">Ответ</span>
                    <select
                      className="input w-auto! py-1! text-xs"
                      value={templates[comment.id] ?? ''}
                      onChange={(event) => {
                        setTemplates((prev) => ({ ...prev, [comment.id]: event.target.value }));
                        if (event.target.value) applyTemplate(comment.id);
                      }}
                      aria-label="Шаблон ответа"
                    >
                      <option value="">Шаблон…</option>
                      {REPLY_TEMPLATES.map((template) => (
                        <option key={template.name} value={template.name}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    className="input min-h-20 text-sm"
                    value={draft}
                    onChange={(event) =>
                      setReplies((prev) => ({ ...prev, [comment.id]: event.target.value }))
                    }
                    placeholder="Напишите ответ или выберите шаблон…"
                    aria-label={`Ответ комментарию ${comment.author}`}
                  />
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary py-1.5! text-xs"
                      onClick={() => toggleStatus(comment)}
                    >
                      → {isNew ? 'Отметить отвеченым' : 'Вернуть в NEW'}
                    </button>
                    <button
                      type="button"
                      className="btn-primary py-1.5! text-xs"
                      disabled={mutations.update.isPending || !draft.trim()}
                      onClick={() => saveReply(comment, true)}
                    >
                      Сохранить и ответить
                    </button>
                    <button
                      type="button"
                      className="btn-danger py-1.5! text-xs"
                      onClick={() => {
                        if (window.confirm('Удалить комментарий?')) {
                          mutations.remove.mutate(comment.id);
                        }
                      }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
