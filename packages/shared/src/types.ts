/** Общие типы DTO (формат ответов REST API). */
import type {
  AiModel,
  AvitoStatus,
  CommentStatus,
  ContractorStatus,
  DocumentType,
  Role,
  TaskPriority,
  TaskStatus,
} from './schemas';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Deadline {
  id: string;
  userId: string;
  taskId: string | null;
  title: string;
  date: string;
  remindedAt: string | null;
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: DocumentType;
  createdAt: string;
  updatedAt: string;
}

export interface SpreadsheetColumn {
  name: string;
}

export interface Spreadsheet {
  id: string;
  userId: string;
  name: string;
  columns: SpreadsheetColumn[];
  rows: string[][];
  updatedAt: string;
}

export interface Slide {
  title: string;
  bullets: string[];
}

export interface Presentation {
  id: string;
  userId: string;
  title: string;
  slides: Slide[];
  updatedAt: string;
}

export interface AiRequestRecord {
  id: string;
  userId: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed: number | null;
  createdAt: string;
}

export interface SearchSource {
  title: string;
  url: string;
}

export interface SearchResultRecord {
  id: string;
  userId: string;
  query: string;
  summary: string;
  sources: SearchSource[];
  createdAt: string;
}

export interface VideoTimestamp {
  time: string;
  note: string;
}

export interface VideoSummaryRecord {
  id: string;
  userId: string;
  url: string;
  summary: string;
  timestamps: VideoTimestamp[];
  createdAt: string;
}

export interface AvitoListing {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  status: AvitoStatus;
  updatedAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  platform: string;
  author: string;
  text: string;
  reply: string;
  status: CommentStatus;
  createdAt: string;
}

export interface Contractor {
  id: string;
  userId: string;
  name: string;
  contact: string;
  skills: string[];
  status: ContractorStatus;
  notes: string;
  createdAt: string;
}

export interface Settings {
  id: string;
  userId: string;
  workHoursStart: string;
  workHoursEnd: string;
  timezone: string;
  aiModel: AiModel;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

/** Сводка для Dashboard. */
export interface DashboardSummary {
  today: {
    total: number;
    done: number;
    inProgress: number;
    overdue: number;
  };
  tasksDueToday: Task[];
  overdueTasks: Task[];
  upcomingDeadlines: Deadline[];
  overdueDeadlines: Deadline[];
  reminders: Deadline[];
  counts: {
    tasks: number;
    documents: number;
    deadlines: number;
    unreadComments: number;
    contractors: number;
    avitoActive: number;
  };
}

export interface AiAskResponse {
  fallback: boolean;
  message?: string;
  id?: string;
  response?: string;
  model: string;
  tokensUsed?: number | null;
  createdAt?: string;
}

export interface SearchResponse {
  id: string;
  query: string;
  summary: string;
  sources: SearchSource[];
  fallback: boolean;
  message?: string;
  createdAt: string;
}

export interface VideoSummaryResponse {
  id: string;
  url: string;
  summary: string;
  timestamps: VideoTimestamp[];
  fallback: boolean;
  message?: string;
  createdAt: string;
}
