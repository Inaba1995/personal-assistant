/**
 * Smoke-тесты API: health, auth (register/login/refresh/logout/me),
 * CRUD + изоляция данных по userId, роли, настройки, fallback ИИ.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/prisma';

const app = createApp();

interface AuthBody {
  user: { id: string; email: string; role: string };
  accessToken: string;
}

async function register(email: string, password = 'Password123'): Promise<AuthBody> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name: 'Тест' })
    .expect(201);
  return res.body as AuthBody;
}

describe('health-check', () => {
  it('GET /health возвращает ok', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('auth', () => {
  it('регистрация, логин, me, валидация пароля', async () => {
    const created = await register('smoke1@test.local');
    expect(created.accessToken).toBeTruthy();
    expect(created.user.email).toBe('smoke1@test.local');

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'smoke1@test.local', password: 'Password123' })
      .expect(200);
    expect((login.body as AuthBody).accessToken).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${(login.body as AuthBody).accessToken}`)
      .expect(200);
    expect(me.body.email).toBe('smoke1@test.local');

    const bad = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad@test.local', password: 'short', name: 'X' })
      .expect(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'smoke1@test.local', password: 'WrongPass999' })
      .expect(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh-токен ротируется, старый перестаёт работать', async () => {
    await register('smoke2@test.local');
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .send({ email: 'smoke2@test.local', password: 'Password123' })
      .expect(200);

    const firstToken = (login.body as AuthBody).accessToken;
    const loginCookies = login.headers['set-cookie'];
    const firstCookie = (Array.isArray(loginCookies) ? loginCookies[0] : loginCookies) ?? '';
    const firstCookiePair = firstCookie.split(';')[0] ?? '';

    const refreshed = await agent.post('/api/auth/refresh').expect(200);
    const newToken = refreshed.body.accessToken as string;
    expect(newToken).not.toBe(firstToken);

    // Новый access-токен работает.
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${newToken}`).expect(200);

    // Старая cookie (ротирована на сервере) больше не принимается.
    await request(app).post('/api/auth/refresh').set('Cookie', firstCookiePair).expect(401);

    await agent.post('/api/auth/logout').expect(204);
    await agent.post('/api/auth/refresh').expect(401);
  });

  it('без токена все защищённые маршруты отдают 401', async () => {
    await request(app).get('/api/tasks').expect(401);
    await request(app).get('/api/dashboard/summary').expect(401);
    await request(app).get('/api/settings').expect(401);
  });
});

describe('CRUD + изоляция данных по userId', () => {
  it('чужая запись → 404, свои данные не видны другому пользователю', async () => {
    const a = await register('iso-a@test.local');
    const b = await register('iso-b@test.local');

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ title: 'Секретная задача A', priority: 'HIGH', tags: ['личное'] })
      .expect(201);
    const taskId = created.body.id as string;

    // B не видит задачу A ни в списке, ни по id.
    const listB = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(listB.body.items).toHaveLength(0);

    await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(404);
    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .send({ title: 'взлом' })
      .expect(404);
    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(404);

    // Владелец видит и редактирует.
    const got = await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(got.body.title).toBe('Секретная задача A');
    expect(got.body.tags).toEqual(['личное']);

    const patched = await request(app)
      .patch(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(200);
    expect(patched.body.status).toBe('IN_PROGRESS');

    // Пагинация и сортировка.
    const paged = await request(app)
      .get('/api/tasks?page=1&limit=10&sort=-createdAt')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(paged.body.page).toBe(1);
    expect(paged.body.total).toBe(1);

    // Удаление.
    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(204);
    await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(404);
  });

  it('дедлайны: создание с датой, фильтрация, каскадное удаление пользователя', async () => {
    const a = await register('iso-c@test.local');

    await request(app)
      .post('/api/deadlines')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ title: 'Дедлайн', date: '2026-12-31' })
      .expect(201);

    const badDate = await request(app)
      .post('/api/deadlines')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ title: 'Некорректный', date: 'не дата' })
      .expect(400);
    expect(badDate.body.error.code).toBe('VALIDATION_ERROR');

    // Каскад: удаляем пользователя — его записи уходят вместе с ним.
    await prisma.user.delete({ where: { email: 'iso-c@test.local' } });
    expect(await prisma.deadline.count()).toBe(0);
  });
});

describe('роли и настройки', () => {
  it('USER не видит /admin/users, ADMIN — видит', async () => {
    const user = await register('plain@test.local');
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(403);

    await prisma.user.update({
      where: { email: 'plain@test.local' },
      data: { role: 'ADMIN' },
    });

    const admin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'plain@test.local', password: 'Password123' })
      .expect(200);
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${(admin.body as AuthBody).accessToken}`)
      .expect(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
    // Парольный хеш никогда не попадает в ответ.
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('GET/PUT /settings: дефолты и обновление модели ИИ', async () => {
    const u = await register('settings@test.local');
    const headers = { Authorization: `Bearer ${u.accessToken}` };

    const initial = await request(app).get('/api/settings').set(headers).expect(200);
    expect(initial.body.aiModel).toBe('gpt-4o-mini');

    const updated = await request(app)
      .put('/api/settings')
      .set(headers)
      .send({ workHoursStart: '10:00', workHoursEnd: '19:00', aiModel: 'gpt-4o' })
      .expect(200);
    expect(updated.body.workHoursStart).toBe('10:00');
    expect(updated.body.aiModel).toBe('gpt-4o');

    const invalid = await request(app)
      .put('/api/settings')
      .set(headers)
      .send({ workHoursStart: '25:99' })
      .expect(400);
    expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('ИИ и дашборд', () => {
  it('/ai/ask без ключа возвращает 200 с fallback', async () => {
    const u = await register('ai@test.local');
    const res = await request(app)
      .post('/api/ai/ask')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ prompt: 'Сделай выжимку: тест' })
      .expect(200);
    expect(res.body.fallback).toBe(true);
    expect(res.body.message).toContain('OPENAI_API_KEY');

    const history = await request(app)
      .get('/api/ai/history')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);
    expect(history.body.items).toHaveLength(0);
  });

  it('GET /dashboard/summary возвращает ожидаемую структуру', async () => {
    const u = await register('dash@test.local');
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .send({ title: 'Сегодняшняя', dueDate: new Date().toISOString(), status: 'TODO' })
      .expect(201);

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);

    expect(res.body.today).toHaveProperty('total');
    expect(res.body.today.total).toBe(1);
    expect(Array.isArray(res.body.overdueTasks)).toBe(true);
    expect(Array.isArray(res.body.reminders)).toBe(true);
    expect(res.body.counts.tasks).toBe(1);
  });

  it('GET /export отдаёт JSON-бэкап без паролей и ключей', async () => {
    const u = await register('export@test.local');
    const res = await request(app)
      .get('/api/export')
      .set('Authorization', `Bearer ${u.accessToken}`)
      .expect(200);
    expect(res.body.user.email).toBe('export@test.local');
    expect(res.body).toHaveProperty('tasks');
    expect(res.body).toHaveProperty('settings');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('OPENAI_API_KEY');
  });
});
