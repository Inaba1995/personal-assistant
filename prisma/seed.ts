/**
 * Сид: 2 демо-пользователя (ADMIN + USER) с по 3 записи в каждом разделе.
 * Идемпотентен: при наличии обоих демо-пользователей выходит без изменений.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASSWORD = 'Demo1234!';

interface DemoData {
  tasks: Array<{
    title: string;
    description: string;
    status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'DONE';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate: Date | null;
    tags: string[];
  }>;
  deadlines: Array<{ title: string; date: Date; offsetDays: number }>;
  documents: Array<{
    title: string;
    content: string;
    type: 'NOTE' | 'LETTER' | 'DOC';
  }>;
  spreadsheets: Array<{
    name: string;
    columns: { name: string }[];
    rows: string[][];
  }>;
  presentations: Array<{ title: string; slides: { title: string; bullets: string[] }[] }>;
  aiRequests: Array<{ prompt: string; response: string; model: string }>;
  searchResults: Array<{ query: string; summary: string; sources: { title: string; url: string }[] }>;
  videoSummaries: Array<{
    url: string;
    summary: string;
    timestamps: { time: string; note: string }[];
  }>;
  avito: Array<{
    title: string;
    description: string;
    price: number;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  }>;
  comments: Array<{
    platform: string;
    author: string;
    text: string;
    reply: string;
    status: 'NEW' | 'ANSWERED';
  }>;
  contractors: Array<{
    name: string;
    contact: string;
    skills: string[];
    status: 'FOUND' | 'CONTACTED' | 'SHORTLISTED' | 'REJECTED';
    notes: string;
  }>;
}

const day = (offset: number): Date => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

const baseData: DemoData = {
  tasks: [
    {
      title: 'Подготовить отчёт по продажам',
      description: 'Свести квартальные цифры, выделить 3 главных вывода.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: day(1),
      tags: ['отчёт', 'важное'],
    },
    {
      title: 'Согласовать договор с подрядчиком',
      description: 'Проверить пункт об оплате и сроки.',
      status: 'TODO',
      priority: 'MEDIUM',
      dueDate: day(3),
      tags: ['договор'],
    },
    {
      title: 'Разобрать входящие письма',
      description: '',
      status: 'DONE',
      priority: 'LOW',
      dueDate: day(-1),
      tags: ['почта'],
    },
  ],
  deadlines: [
    { title: 'Сдать квартальный отчёт', date: day(2), offsetDays: 2 },
    { title: 'Совещание по плану отдела', date: day(5), offsetDays: 5 },
    { title: 'Оплатить счёт за сервисы', date: day(-1), offsetDays: -1 },
  ],
  documents: [
    {
      title: 'Заметки с планёрки',
      content: '# Итоги планёрки\n\n- Договориться с подрядчиком\n- Обновить презентацию\n- Отправить отчёт',
      type: 'NOTE',
    },
    {
      title: 'Письмо клиенту: подтверждение встречи',
      content:
        'Здравствуйте, Алексей!\n\nПодтверждаю нашу встречу в четверг в 15:00. Пришлю материалы заранее.\n\nС уважением,\nИван',
      type: 'LETTER',
    },
    {
      title: 'Служебная записка о переносе отпуска',
      content:
        'Директору ООО «Пример»\n\nПрошу перенести ежегодный отпуск на период с 10 по 20 число.\n\nС уважением, Иван Петров',
      type: 'DOC',
    },
  ],
  spreadsheets: [
    {
      name: 'Бюджет отдела',
      columns: [{ name: 'Статья' }, { name: 'Сумма' }, { name: 'Факт' }],
      rows: [
        ['Аренда', '50000', '50000'],
        ['Программы', '15000', '12500'],
        ['Реклама', '30000', '28000'],
      ],
    },
    {
      name: 'Часы по проектам',
      columns: [{ name: 'Проект' }, { name: 'Часы' }],
      rows: [
        ['Сайт', '40'],
        ['Мобильное приложение', '25'],
        ['Поддержка', '10'],
      ],
    },
    {
      name: 'Контакты подрядчиков',
      columns: [{ name: 'Компания' }, { name: 'Телефон' }],
      rows: [
        ['Ромашка', '+7 900 000-00-01'],
        ['Строй-Про', '+7 900 000-00-02'],
      ],
    },
  ],
  presentations: [
    {
      title: 'Отчёт за квартал',
      slides: [
        { title: 'Итоги квартала', bullets: ['Выручка +12%', '3 новых клиента', 'Сроки выдержаны'] },
        { title: 'Проблемы', bullets: ['Задержка поставок', 'Перегрузка команды'] },
        { title: 'Планы', bullets: ['Автоматизация отчётов', 'Найм 2 специалистов'] },
      ],
    },
    {
      title: 'Онбординг нового сотрудника',
      slides: [
        { title: 'Первая неделя', bullets: ['Доступы и оборудование', 'Знакомство с командой'] },
        { title: 'Вторая неделя', bullets: ['Первая задача', 'Ревью с наставником'] },
      ],
    },
    {
      title: 'Презентация продукта',
      slides: [
        { title: 'Что мы решаем', bullets: ['Рутина съедает время', 'Данные в разных местах'] },
        { title: 'Решение', bullets: ['Единый ассистент', 'Работает офлайн-стеком'] },
      ],
    },
  ],
  aiRequests: [
    {
      prompt: 'Сделай выжимку из текста отчёта',
      response: '1. Выручка выросла на 12%.\n2. Два клиента ушли из-за сроков.\n3. Требуется найм.',
      model: 'gpt-4o-mini',
    },
    {
      prompt: 'Перепиши письмо вежливее',
      response: 'Здравствуйте! Будем признательны, если вы сможете прислать документы до пятницы.',
      model: 'gpt-4o-mini',
    },
    {
      prompt: 'Составь план на неделю',
      response: '1. Пн — отчёт.\n2. Вт–Ср — переговоры.\n3. Чт — презентация.\n4. Пт — ретроспектива.',
      model: 'gpt-4o-mini',
    },
  ],
  searchResults: [
    {
      query: 'Как оформить служебную записку',
      summary: 'Служебная записка содержит заголовок, суть вопроса и дату. Подписывается автором.',
      sources: [{ title: 'Шаблон документа', url: 'https://example.com/doc-template' }],
    },
    {
      query: 'Сроки ответа на коммерческое предложение',
      summary: 'Стандартный срок — 3–5 рабочих дней; срочное КП — до 24 часов.',
      sources: [{ title: 'Практика делового оборота', url: 'https://example.com/b2b' }],
    },
    {
      query: 'Кто в компании согласует бюджет',
      summary: 'Бюджет согласует финансовый директор, при превышении лимита — генеральный.',
      sources: [],
    },
  ],
  videoSummaries: [
    {
      url: 'https://example.com/video/lecture-1',
      summary: 'Лекция о тайм-менеджменте: матрица приоритетов, правило 2 минут, ежедневный планировщик.',
      timestamps: [
        { time: '00:00', note: 'Вступление' },
        { time: '03:15', note: 'Матрица Эйзенхауэра' },
        { time: '12:40', note: 'Правило 2 минут' },
      ],
    },
    {
      url: 'https://example.com/video/meeting-42',
      summary: 'Обсуждение релиза: перенос даты, заморозка фич, план тестирования.',
      timestamps: [
        { time: '01:05', note: 'Статус релиза' },
        { time: '08:30', note: 'Решение о переносе' },
      ],
    },
    {
      url: 'https://example.com/video/sales-webinar',
      summary: 'Вебинар по продажам: квалификация лида, работа с возражениями, каскад точек контакта.',
      timestamps: [
        { time: '00:20', note: 'Квалификация' },
        { time: '15:00', note: 'Возражения' },
      ],
    },
  ],
  avito: [
    {
      title: 'Продам монитор 27"',
      description: 'Монитор 27", 2K, состояние отличное, коробка и кабели в комплекте.',
      price: 12000,
      status: 'ACTIVE',
    },
    {
      title: 'Услуги настройки ПК',
      description: 'Настройка Windows, установка программ, чистка от вирусов. Выезд возможен.',
      price: 1500,
      status: 'DRAFT',
    },
    {
      title: 'Комплект офисных стульев',
      description: '5 стульев, сетка, регулировка высоты. Продаёмся после переезда.',
      price: 25000,
      status: 'ARCHIVED',
    },
  ],
  comments: [
    {
      platform: 'Авито',
      author: 'Мария',
      text: 'Здравствуйте! Торг уместен?',
      reply: '',
      status: 'NEW',
    },
    {
      platform: 'Соцсети',
      author: 'Игорь',
      text: 'Когда сможете отправить?',
      reply: 'Отправим завтра в первую половину дня.',
      status: 'ANSWERED',
    },
    {
      platform: 'Отзывы',
      author: 'Анна',
      text: 'Всё понравилось, спасибо!',
      reply: '',
      status: 'NEW',
    },
  ],
  contractors: [
    {
      name: 'Алексей Ковалёв',
      contact: 'alex@example.com',
      skills: ['Дизайн', 'Figma'],
      status: 'SHORTLISTED',
      notes: 'Портфолио сильное, ждём согласование бюджета.',
    },
    {
      name: 'Ольга Смирнова',
      contact: '+7 900 111-22-33',
      skills: ['Копирайтинг', 'SEO'],
      status: 'CONTACTED',
      notes: 'Ответила, отправили тестовое задание.',
    },
    {
      name: 'ИП Романов',
      contact: 'romanov@example.com',
      skills: ['Ремонт', 'Электрика'],
      status: 'FOUND',
      notes: 'Найден по рекомендации.',
    },
  ],
};

async function seedUser(email: string, name: string, role: 'ADMIN' | 'USER', suffix: string) {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });

  // Настройки
  await prisma.settings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, timezone: 'Europe/Moscow' },
  });

  const existingTasks = await prisma.task.count({ where: { userId: user.id } });
  if (existingTasks > 0) {
    console.log(`[seed] ${email}: данные уже есть, пропускаем`);
    return;
  }

  for (const t of baseData.tasks) {
    await prisma.task.create({
      data: {
        userId: user.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        tags: t.tags,
      },
    });
  }

  for (const d of baseData.deadlines) {
    await prisma.deadline.create({
      data: { userId: user.id, title: `${d.title} (${suffix})`, date: d.date },
    });
  }

  for (const doc of baseData.documents) {
    await prisma.document.create({ data: { userId: user.id, ...doc } });
  }

  for (const s of baseData.spreadsheets) {
    await prisma.spreadsheet.create({
      data: { userId: user.id, name: `${s.name} (${suffix})`, columns: s.columns, rows: s.rows },
    });
  }

  for (const p of baseData.presentations) {
    await prisma.presentation.create({ data: { userId: user.id, ...p } });
  }

  for (const a of baseData.aiRequests) {
    await prisma.aiRequest.create({ data: { userId: user.id, ...a } });
  }

  for (const s of baseData.searchResults) {
    await prisma.searchResult.create({ data: { userId: user.id, ...s } });
  }

  for (const v of baseData.videoSummaries) {
    await prisma.videoSummary.create({ data: { userId: user.id, ...v } });
  }

  for (const a of baseData.avito) {
    await prisma.avitoListing.create({ data: { userId: user.id, ...a } });
  }

  for (const c of baseData.comments) {
    await prisma.comment.create({ data: { userId: user.id, ...c } });
  }

  for (const c of baseData.contractors) {
    await prisma.contractor.create({ data: { userId: user.id, ...c } });
  }

  console.log(`[seed] ${email}: создано по 3 записи в каждом разделе`);
}

async function main() {
  await seedUser('user1@demo.local', 'Демо Пользователь 1', 'ADMIN', 'демо 1');
  await seedUser('user2@demo.local', 'Демо Пользователь 2', 'USER', 'демо 2');
  console.log('[seed] Готово. Логины: user1@demo.local / user2@demo.local, пароль Demo1234!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
