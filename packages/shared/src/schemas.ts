/**
 * Общие zod-схемы для валидации на бэкенде и фронте.
 * Правило: код/имена — английский, сообщения об ошибках — русский.
 */
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/* Перечисления (соответствуют enum в Prisma)                          */
/* ------------------------------------------------------------------ */

export const roleSchema = z.enum(['ADMIN', 'USER']);
export const taskStatusSchema = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']);
export const taskPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);
export const documentTypeSchema = z.enum(['NOTE', 'LETTER', 'DOC']);
export const avitoStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']);
export const commentStatusSchema = z.enum(['NEW', 'ANSWERED']);
export const contractorStatusSchema = z.enum(['FOUND', 'CONTACTED', 'SHORTLISTED', 'REJECTED']);
export const aiModelSchema = z.enum([
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
]);

export type Role = z.infer<typeof roleSchema>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type AvitoStatus = z.infer<typeof avitoStatusSchema>;
export type CommentStatus = z.infer<typeof commentStatusSchema>;
export type ContractorStatus = z.infer<typeof contractorStatusSchema>;
export type AiModel = z.infer<typeof aiModelSchema>;

export const AI_MODELS: readonly AiModel[] = [
  'gpt-4o-mini',
  'gpt-4o',
  'gpt-4.1-mini',
  'gpt-4.1',
] as const;

export const TASK_STATUSES = taskStatusSchema.options;
export const TASK_PRIORITIES = taskPrioritySchema.options;

/* ------------------------------------------------------------------ */
/* Базовые поля                                                        */
/* ------------------------------------------------------------------ */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Введите email')
  .email('Введите корректный email')
  .max(254)
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .max(128, 'Пароль слишком длинный');

/** Дата как строка (ISO или YYYY-MM-DD); валидируется и передаётся в Prisma как есть. */
export const dateStringSchema = z
  .string()
  .min(1, 'Укажите дату')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Некорректная дата')
  // Prisma принимает только полный ISO-8601: '2026-12-31' → '2026-12-31T00:00:00.000Z'.
  .transform((v) => new Date(v).toISOString());

export const nullableDateString = dateStringSchema.nullable().optional();

/** Идентификатор записи. */
export const idSchema = z.string().min(1).max(64);

/** Пагинация/сортировка: ?page&limit&sort (сортировка: field или -field). */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^-?[a-zA-Z]+$/, 'Некорректное поле сортировки')
    .optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, 'Введите имя').max(80),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Введите пароль').max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/* ------------------------------------------------------------------ */
/* Task                                                                */
/* ------------------------------------------------------------------ */

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(200),
  description: z.string().max(5000).default(''),
  status: taskStatusSchema.default('BACKLOG'),
  priority: taskPrioritySchema.default('MEDIUM'),
  dueDate: nullableDateString,
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;

/* ------------------------------------------------------------------ */
/* Deadline                                                            */
/* ------------------------------------------------------------------ */

export const deadlineCreateSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(200),
  date: dateStringSchema,
  taskId: z.string().min(1).max(64).nullable().optional(),
  remindedAt: dateStringSchema.nullable().optional(),
});

export const deadlineUpdateSchema = deadlineCreateSchema.partial();

export type DeadlineCreateInput = z.infer<typeof deadlineCreateSchema>;

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export const documentCreateSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(200),
  content: z.string().max(100_000).default(''),
  type: documentTypeSchema.default('NOTE'),
});

export const documentUpdateSchema = documentCreateSchema.partial();

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;

/* ------------------------------------------------------------------ */
/* Spreadsheet                                                         */
/* ------------------------------------------------------------------ */

export const spreadsheetColumnSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export const spreadsheetCreateSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(200),
  columns: z.array(spreadsheetColumnSchema).min(1).max(50).default([{ name: 'Столбец 1' }]),
  rows: z.array(z.array(z.string().max(500))).max(1000).default([]),
});

export const spreadsheetUpdateSchema = spreadsheetCreateSchema.partial();

export type SpreadsheetCreateInput = z.infer<typeof spreadsheetCreateSchema>;

/* ------------------------------------------------------------------ */
/* Presentation                                                        */
/* ------------------------------------------------------------------ */

export const slideSchema = z.object({
  title: z.string().trim().min(1).max(200),
  bullets: z.array(z.string().max(500)).max(30),
});

export const presentationCreateSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(200),
  slides: z.array(slideSchema).max(100).default([]),
});

export const presentationUpdateSchema = presentationCreateSchema.partial();

export type PresentationCreateInput = z.infer<typeof presentationCreateSchema>;

/* ------------------------------------------------------------------ */
/* AI / Search / Video                                                 */
/* ------------------------------------------------------------------ */

export const aiAskSchema = z.object({
  prompt: z.string().trim().min(1, 'Введите запрос').max(8000),
  model: aiModelSchema.optional(),
  sources: z
    .array(
      z.object({
        title: z.string().max(300).default('Источник'),
        url: z.string().max(2000),
      }),
    )
    .max(20)
    .default([]),
});

export const searchCreateSchema = z.object({
  query: z.string().trim().min(1, 'Введите запрос').max(500),
  text: z.string().trim().min(1, 'Вставьте текст для анализа').max(50_000),
});

export const videoSummarySchema = z.object({
  url: z.string().trim().max(2000).default(''),
  transcript: z.string().trim().min(1, 'Вставьте транскрипт или укажите URL').max(100_000),
});

export type AiAskInput = z.infer<typeof aiAskSchema>;
export type SearchCreateInput = z.infer<typeof searchCreateSchema>;
export type VideoSummaryInput = z.infer<typeof videoSummarySchema>;

/* ------------------------------------------------------------------ */
/* Avito / Comment / Contractor                                        */
/* ------------------------------------------------------------------ */

export const avitoCreateSchema = z.object({
  title: z.string().trim().min(1, 'Введите заголовок').max(300),
  description: z.string().max(10_000).default(''),
  price: z.coerce.number().min(0).max(1_000_000_000).default(0),
  status: avitoStatusSchema.default('DRAFT'),
});

export const avitoUpdateSchema = avitoCreateSchema.partial();

export const commentCreateSchema = z.object({
  platform: z.string().trim().min(1).max(60),
  author: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1, 'Введите текст комментария').max(5000),
  reply: z.string().max(5000).default(''),
  status: commentStatusSchema.default('NEW'),
});

export const commentUpdateSchema = commentCreateSchema.partial();

export const contractorCreateSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя').max(120),
  contact: z.string().trim().max(200).default(''),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  status: contractorStatusSchema.default('FOUND'),
  notes: z.string().max(10_000).default(''),
});

export const contractorUpdateSchema = contractorCreateSchema.partial();

export type AvitoCreateInput = z.infer<typeof avitoCreateSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
export type ContractorCreateInput = z.infer<typeof contractorCreateSchema>;

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const settingsUpdateSchema = z
  .object({
    workHoursStart: z.string().regex(timeRegex, 'Формат: ЧЧ:ММ').default('09:00'),
    workHoursEnd: z.string().regex(timeRegex, 'Формат: ЧЧ:ММ').default('18:00'),
    timezone: z.string().min(1).max(80).default('Europe/Moscow'),
    aiModel: aiModelSchema.default('gpt-4o-mini'),
  })
  .partial();

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
