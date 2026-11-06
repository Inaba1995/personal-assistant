import { Router, type Request, type Response } from 'express';
import type { DashboardSummary } from '@assistant/shared';
import { asyncHandler } from '../lib/asyncHandler';
import { serialize } from '../lib/json';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

/* GET /dashboard/summary — задачи на сегодня, дедлайны, просрочки, счётчики. */
dashboardRouter.get(
  '/summary',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const inTwoDays = new Date(now.getTime() + 2 * DAY_MS);
    const inSevenDays = new Date(now.getTime() + 7 * DAY_MS);

    const [
      dueToday,
      overdueTasks,
      upcomingDeadlines,
      overdueDeadlines,
      taskCount,
      documentCount,
      deadlineCount,
      unreadComments,
      contractorCount,
      avitoActive,
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId, dueDate: { gte: startOfToday, lte: endOfToday } },
        orderBy: { priority: 'desc' },
      }),
      prisma.task.findMany({
        where: { userId, dueDate: { lt: startOfToday }, status: { not: 'DONE' } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      prisma.deadline.findMany({
        where: { userId, date: { gte: now, lte: inSevenDays } },
        orderBy: { date: 'asc' },
      }),
      prisma.deadline.findMany({
        where: { userId, date: { lt: now } },
        orderBy: { date: 'asc' },
        take: 20,
      }),
      prisma.task.count({ where: { userId } }),
      prisma.document.count({ where: { userId } }),
      prisma.deadline.count({ where: { userId } }),
      prisma.comment.count({ where: { userId, status: 'NEW' } }),
      prisma.contractor.count({ where: { userId } }),
      prisma.avitoListing.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const doneToday = dueToday.filter((t) => t.status === 'DONE').length;
    const inProgressToday = dueToday.filter((t) => t.status === 'IN_PROGRESS').length;

    // Напоминания: дедлайны на ближайшие 48 часов + уже просроченные.
    const reminders = await prisma.deadline.findMany({
      where: { userId, date: { lte: inTwoDays } },
      orderBy: { date: 'asc' },
      take: 10,
    });

    const summary: DashboardSummary = {
      today: {
        total: dueToday.length,
        done: doneToday,
        inProgress: inProgressToday,
        overdue: overdueTasks.length,
      },
      tasksDueToday: serialize<DashboardSummary['tasksDueToday']>(dueToday),
      overdueTasks: serialize<DashboardSummary['overdueTasks']>(overdueTasks),
      upcomingDeadlines: serialize<DashboardSummary['upcomingDeadlines']>(upcomingDeadlines),
      overdueDeadlines: serialize<DashboardSummary['overdueDeadlines']>(overdueDeadlines),
      reminders: serialize<DashboardSummary['reminders']>(reminders),
      counts: {
        tasks: taskCount,
        documents: documentCount,
        deadlines: deadlineCount,
        unreadComments,
        contractors: contractorCount,
        avitoActive,
      },
    };

    res.json(summary);
  }),
);
