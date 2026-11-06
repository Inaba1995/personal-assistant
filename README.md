# Персональный ассистент

Веб-приложение для ведения офисной рутины удалённо: задачи и дедлайны, документы, таблицы,
презентации, поиск и анализ информации, работа с ИИ, Авито (ручной режим), комментарии и
поиск исполнителей. Мультипользовательское: каждый пользователь видит строго свои данные.

## Быстрый старт

```bash
npm install        # установка зависимостей (workspaces)
npm run dev        # API (4000) + фронт (5173) одной командой
```

Команда `npm run dev` сама:
1. создаёт `.env` из `.env.example`, если его нет;
2. генерирует Prisma Client и применяет схему к SQLite (`prisma/dev.db`);
3. выполняет сид (2 демо-пользователя с данными);
4. запускает shared (tsc -w), API (tsx watch) и фронт (Vite) параллельно.

Откройте **http://localhost:5173**.

Демо-доступы (создаются сидом):

| Email | Пароль | Роль |
|---|---|---|
| `user1@demo.local` | `Demo1234!` | ADMIN |
| `user2@demo.local` | `Demo1234!` | USER |

Продакшен-сборка:

```bash
npm run build      # shared → API (tsc) → фронт (Vite)
npm start          # API на :4000 отдаёт и API, и собранный фронт
```

Прочие команды:

| Команда | Что делает |
|---|---|
| `npm test` | Тесты всех workspace (Vitest: API smoke + компоненты + формулы) |
| `npm run lint` | ESLint (flat config) по всему репозиторию |
| `npm run typecheck` | `tsc --noEmit` для shared, api, web (shared сначала собирается) |
| `npm run format` | Prettier |
| `npm run db:reset` | Сброс SQLite + повторный сид |
| `npm run db:studio` | Prisma Studio (просмотр БД) |

## Деплой на Railway

Репозиторий подготовлен к Railway: в корне лежит `railway.toml` — он сам задаёт
сборку и запуск, руками команды вводить не нужно:

- **Build:** `npm run build` (shared → Prisma Client → API → фронт)
- **Start:** `prisma db push` (схема) → `prisma db seed` (демо-данные, идемпотентно) →
  `node apps/api/dist/index.js` — API отдаёт и REST, и собранный фронт
- **Healthcheck:** `GET /health`

Порядок действий в дашборде Railway (сервис → вкладка **Settings**):

1. **Variables** — добавь:

   | Переменная | Значение |
   |---|---|
   | `DATABASE_URL` | `file:/data/dev.db` (с volume, см. п. 2) или `file:/tmp/dev.db` (быстрый старт, данные сбрасываются при каждом деплое) |
   | `JWT_SECRET` | `openssl rand -hex 32` |
   | `JWT_REFRESH_SECRET` | `openssl rand -hex 32` (другое, не как JWT_SECRET) |
   | `CORS_ORIGIN` | `https://<имя-сервиса>.up.railway.app` |
   | `OPENAI_API_KEY` | опционально, `sk-…` — без него ИИ работает в режиме заглушки |
   | `NIXPACKS_NODE_VERSION` | `24` |

   ⚠️ **`NODE_ENV` не ставь** — иначе установка уйдёт в production-режим и на этапе
   сборки не будет `typescript`/`vite`.

2. **Volume (persistent SQLite)** — вкладка **Volumes → Create Volume**:
   mount path `/data`, регион должен совпадать с регионом сервиса (например, US West).
   Без volume база будет жить во временной файловой системе и **обнуляться при каждом
   деплое/перезапуске**.

3. Нажми **Apply changes → Deploy**. После сборки сервис поднимется на домене
   `https://<имя-сервиса>.up.railway.app` — с этого адреса доступны и интерфейс, и API.

Логин после деплоя: `user1@demo.local` / `Demo1234!` (сид выполняется при старте).

## Стек и обоснование зависимостей

**Frontend:** React 19 + TypeScript + Vite 6, TailwindCSS 4, React Router 7, TanStack Query 5.
**Backend:** Node.js + Express 4 + TypeScript.
**БД:** SQLite через Prisma ORM — запуск без внешней инфраструктуры.
**Auth:** JWT (access 15 мин + refresh 7 дней в httpOnly-cookie), bcrypt-хеши (bcryptjs).
**Валидация:** zod — общие схемы в `packages/shared` (используются и на бэке, и на фронте).
**ИИ:** официальный SDK `openai`, модель по умолчанию `gpt-4o-mini`.
**Тесты:** Vitest + supertest (API), @testing-library/react (компоненты).
**Логирование:** pino + pino-http. **Безопасность:** helmet, cors, express-rate-limit, cookie-parser.

Обоснования «новых» зависимостей:

| Зачем | Пакет | Почему именно он |
|---|---|---|
| Хеши паролей | `bcryptjs` | Алгоритм bcrypt идентичен `bcrypt`, но без нативной сборки — `npm install` работает на любой машине без Xcode/Python |
| Экспорт презентаций | `pptxgenjs` | Генерация .pptx прямо в браузере, без сервера и LibreOffice |
| Токены | `jsonwebtoken` | Стандарт для JWT в Express |
| Заголовки/ограничения | `helmet`, `express-rate-limit`, `cors`, `cookie-parser` | Минимальный набор из ТЗ |
| Drag & drop | — | Реализован нативными HTML5 DnD (без библиотек) |
| Markdown | — | Мини-рендерер в `web/src/lib/markdown.tsx` (без dangerouslySetInnerHTML) |
| Формулы | — | Свой	evaluator в `web/src/lib/formula.ts` (SUM/AVG/COUNT), покрыт тестами |
| CSV | — | Ручная сериализация с BOM в `web/src/lib/csv.ts` |

## Структура репозитория

```
├── apps/
│   ├── api/                 # Express + TypeScript
│   │   ├── src/
│   │   │   ├── app.ts       # сборка приложения (middleware, маршруты, static)
│   │   │   ├── index.ts     # точка входа, graceful shutdown
│   │   │   ├── config.ts    # env (только .env, секреты не логируются)
│   │   │   ├── errors.ts    # AppError + коды ошибок
│   │   │   ├── middleware/  # requireAuth, requireAdmin, errorHandler
│   │   │   ├── lib/         # crudFactory, aiService, pagination, rateLimit…
│   │   │   └── routes/      # auth, tasks…, ai, search, video, dashboard, admin
│   │   └── tests/           # smoke-тесты API (supertest)
│   └── web/                 # React + Vite
│       └── src/
│           ├── api/         # fetch-клиент с refresh + хуки TanStack Query
│           ├── components/  # Layout, Sidebar, Topbar, Modal, Badge…
│           ├── pages/       # 13 разделов + Login/Register
│           ├── lib/         # toast, markdown, formula, csv, pptx, format
│           └── test/        # setup тестов
├── packages/
│   └── shared/              # zod-схемы и типы DTO (общие для api и web)
├── prisma/
│   ├── schema.prisma        # модели, enum, каскады, индексы по userId
│   └── seed.ts              # 2 демо-пользователя × 3 записи в раздел
├── scripts/ensure-env.mjs   # автосоздание .env
├── .env.example
└── README.md
```

Слои API: `routes → controllers(обработчики в routes) → services(lib) → prisma`.
CRUD-ресурсы собраны фабрикой `lib/crudFactory.ts` — единая логика пагинации, сортировки,
фильтров и изоляции по `userId`.

## Переменные окружения (`.env`)

Скопируйте `.env.example` → `.env` (сделает `npm run dev`):

| Переменная | Назначение |
|---|---|
| `DATABASE_URL` | `file:./dev.db` — путь к SQLite относительно `prisma/` |
| `JWT_SECRET` | Секрет access-токенов (15 мин). Сменить: `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Секрет refresh-токенов (7 дней), отдельный! |
| `OPENAI_API_KEY` | **Опционально.** Ключ OpenAI. Пусто → режим заглушки |
| `PORT` | Порт API (по умолчанию 4000) |
| `CORS_ORIGIN` | Origin фронта: `http://localhost:5173` |

## Безопасность

- **Пароли.** Хранятся только в виде bcrypt-хеша (cost 12) в `User.passwordHash`.
  Минимальная длина 8 символов проверяется zod и на бэке, и на фронте. В ответы API
  хеш никогда не попадает (проверяется тестами).
- **Токены.** Access-токен (JWT, 15 мин) живёт в памяти/localStorage и уходит в заголовке
  `Authorization: Bearer`. Refresh-токен (7 дней) — **только httpOnly-cookie** (`SameSite=Lax`,
  `Secure` в проде, path `/api/auth`), в JavaScript недоступен. В БД хранится лишь
  SHA-256-хеш refresh-токена. При каждом `/auth/refresh` старый токен удаляется (ротация),
  невалидный → 401 и выход из аккаунта.
- **Изоляция данных.** Все запросы фильтруются по `userId` из JWT. Чужая запись → **404**
  (не 403, чтобы не раскрывать существование id). Подтверждено тестами.
- **Роли.** `GET /admin/users` доступен только `ADMIN`; для `USER` — 403.
- **Ключ OpenAI.** Живёт **только** в `.env` на сервере (`OPENAI_API_KEY`), не пишется в БД,
  не отдаётся на фронт и не редактируется из UI. Без него `/ai/ask` возвращает 200 с
  `{ fallback: true, message }` — приложение продолжает работать.
- **Транспорт.** helmet (безопасные заголовки), CORS только для `CORS_ORIGIN`,
  `express.json({ limit: '1mb' })`, rate-limit: 60 запросов/15 мин на `/auth/*`,
  20 запросов/мин на `/ai/ask`.
- **Валидация.** Каждое входное тело проходит zod-схемы (whitelist полей, лимиты длины,
  перечисления enum) — «сырые» данные в Prisma не попадают.
- **Секреты.** Только в `.env`, который в `.gitignore`. Ротация: поменяйте значения и
  перезапустите — все текущие сессии станут недействительными.
- **ИИ.** В OpenAI уходит только текст вашего запроса и (опционально) переданные вами
  источники; персональные данные других пользователей не отправляются.

## API

Базовый префикс — `/api` (фронт ходит через proxy Vite). Все маршруты, кроме
`/auth/*` и `/health`, требуют `Authorization: Bearer <accessToken>`.

| Группа | Маршруты |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| CRUD | `/tasks`, `/deadlines`, `/documents`, `/spreadsheets`, `/presentations`, `/avito`, `/comments`, `/contractors` — `GET /` (пагинация `?page&limit`, сортировка `?sort=-field`, фильтры `?status=…`), `GET /:id`, `POST /`, `PATCH|PUT /:id`, `DELETE /:id` |
| ИИ | `POST /ai/ask`, `GET /ai/history` |
| Поиск | `POST /search`, `GET /search/history` |
| Видео | `POST /video/summary`, `GET /video/history` |
| Прочее | `GET /dashboard/summary`, `GET|PUT /settings`, `GET /export`, `GET /admin/users` (ADMIN), `GET /health` |

Формат ошибок всегда один: `{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }`.
Формат списка: `{ items, page, limit, total, totalPages }`.

## Разделы интерфейса

1. **Dashboard** — задачи на сегодня, ближайшие дедлайны, просрочки, баннер напоминаний, быстрые действия.
2. **Планировщик** — Kanban Backlog/Todo/In Progress/Done с drag&drop, фильтры по приоритету/тегу/дате, CRUD.
3. **Дедлайны** — календарь месяца + список, подсветка просрочек, бейдж в меню и баннер на Главной.
4. **Документы** — список, редактор с markdown-превью, типы note/letter/doc, шаблоны писем, «Сгенерировать с ИИ».
5. **Таблицы** — editable grid, добавление/удаление строк и столбцов, формулы `=SUM()/=AVG()/=COUNT()`, экспорт CSV.
6. **Презентации** — конструктор слайдов, перестановка, экспорт `.pptx`.
7. **ИИ-ассистент** — чат, история, шаблоны промптов, заглушка без ключа.
8. **Поиск и анализ** — запрос + вставленный текст/ссылки → выжимка и источники, история.
9. **Видео-резюме** — URL/транскрипт → резюме + таймкоды, история.
10. **Авито** — CRUD объявлений, статусы, шаблоны ответов, «Скопировать текст» (без API Авито).
11. **Комментарии** — инбокс, ответ по шаблону, статус NEW → ANSWERED.
12. **Исполнители** — карточки с навыками, воронка FOUND → CONTACTED → SHORTLISTED → REJECTED, заметки.
13. **Настройки** — рабочие часы, таймзона, модель OpenAI, JSON-бэкап, тема, выход.

Плюс: вход/регистрация, тёмная/светлая тема, адаптивная вёрстка (сайдбар → бургер-меню),
тосты, лоадеры и пустые состояния.

## Тесты

```bash
npm test
```

- **API (11 тестов):** health; регистрация/логин/me/валидация; ротация refresh (старый cookie → 401);
  изоляция данных (чужая запись → 404, список чужой); каскадное удаление; роли ADMIN/USER;
  настройки GET/PUT; ИИ-fallback без ключа; структура dashboard; JSON-бэкап без секретов.
  Тесты используют отдельную базу `prisma/test.db` (сбрасывается перед прогоном).
- **Web (10 тестов):** `PriorityBadge`/`TaskStatusBadge`, валидация формы входа (общая zod-схема),
  evaluator формул SUM/AVG/COUNT/вложенных ссылок.

## Скриншоты

Скриншоты лежат в [`docs/screenshots/`](docs/screenshots):

| Файл | Что на экране |
|---|---|
| `login.png` | Вход и демо-доступ |
| `dashboard.png` | Главная: напоминания, задачи на сегодня, дедлайны |
| `tasks.png` | Kanban-планировщик с фильтрами |
| `ai.png` | ИИ-ассистент (реальный ответ или заглушка) |
| `documents.png` | Редактор документов с markdown-превью |
| `settings.png` | Настройки: часы, таймзона, модель, бэкап |

Мобильная версия (iPhone 390×664, эмуляция):

| Файл | Что на экране |
|---|---|
| `mobile-dashboard.png` | Главная: баннер напоминаний, статистика в 2 колонки |
| `mobile-tasks.png` | Kanban одной колонкой + смена статуса селектом |
| `mobile-documents.png` | Компактный список документов и редактор |
| `mobile-ai.png` | Чат ИИ с полем ввода на видимой части экрана |
| `mobile-spreadsheets.png` | Таблица с горизонтальным скроллом внутри контейнера |
| `mobile-settings.png` | Настройки и JSON-бэкап |

Как снять самостоятельно: запустите `npm run dev`, войдите как `user1@demo.local`,
сделайте скриншот нужного раздела и положите файл в `docs/screenshots/` с именем из таблицы.

## Принятые решения и отклонения от ТЗ

1. **`tags[]` и `skills[]` хранятся как Json, а не scalar list.** SQLite-коннектор Prisma
   не поддерживает массивы скаляров; в схеме это `Json @default("[]")`, на границе API/фронт
   всегда `string[]` (zod гарантирует).
2. **Добавлена модель `RefreshToken`.** ТЗ требует ротацию refresh-токенов — без хранения
   хеша ротацию проверить невозможно. Модель содержит только `tokenHash`, `expiresAt` и
   каскадное удаление вместе с пользователем.
3. **`dueDate`/`date` приходят строками ISO.** zod-схема нормализует `YYYY-MM-DD` → полный ISO,
   Prisma принимает строку; в ответах — ISO от `JSON.stringify`.
4. **Авито — только ручной режим** (как в ТЗ): без вызовов API, хранение + шаблоны + копирование.
5. **Поиск без скрейпинга:** ссылки из вставленного текста извлекаются регулярным выражением
   и попадают в источники; выжимку делает ИИ по вашему тексту.
6. **В проде API отдаёт статику фронта** (`apps/web/dist`), если она собрана — `npm start`
   поднимает всё приложение на одном порту.
7. **CSP отключён в helmet:** в dev фронт идёт через Vite-proxy, в проде отдаётся собранный
   Vite-бандл; остальные защитные заголовки helmet включены.
8. **Мобильная версия:** сайдбар уходит в бургер-меню, поиск — на вторую строку топбара,
   инпуты 16px (иначе iOS Safari зумит), высота чата в `dvh` (учёт панели браузера),
   Kanban в одну колонку со сменой статуса селектом (drag&drop на тач-устройствах недоступен),
   списки-сайдбары компактные, формы в модалках складываются в одну колонку.
   Проверено автоматически: нет горизонтального переполнения ни на одном из 13 экранов (390px).

## Что не реализовано

- **Публикация объявлений на Авито / парсинг сайтов** — запрещены ТЗ (ручной режим и текст,
  вставленный пользователем).
- **Отправка писем и реальный ответ на комментарии** — только редактирование и шаблоны;
  внешние почтовые/мессенджер-интеграции не входят в ТЗ.
- **WebSocket-пуш напоминаний** — напоминания опрашиваются раз в минуту (`refetchInterval`),
  для офлайн-рутины этого достаточно; long-polling/WebSocket избыточен.
- **Скриншоты тёмной темы и мобильной вёрстки** — в `docs/screenshots` основные экраны;
  тёмная тема включается кнопкой в верхней панели, адаптив проверяется уменьшением окна.
