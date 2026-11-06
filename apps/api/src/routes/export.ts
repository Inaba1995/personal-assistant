import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../prisma';
import { requireAuth } from '../middleware/auth';

export const exportRouter = Router();

/**
 * GET /export — полный JSON-бэкап данных текущего пользователя
 * (используется в Settings → «Экспорт данных»).
 */
exportRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;
    const [
      user,
      settings,
      tasks,
      deadlines,
      documents,
      spreadsheets,
      presentations,
      aiRequests,
      searchResults,
      videoSummaries,
      avitoListings,
      comments,
      contractors,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.settings.findUnique({ where: { userId } }),
      prisma.task.findMany({ where: { userId } }),
      prisma.deadline.findMany({ where: { userId } }),
      prisma.document.findMany({ where: { userId } }),
      prisma.spreadsheet.findMany({ where: { userId } }),
      prisma.presentation.findMany({ where: { userId } }),
      prisma.aiRequest.findMany({ where: { userId } }),
      prisma.searchResult.findMany({ where: { userId } }),
      prisma.videoSummary.findMany({ where: { userId } }),
      prisma.avitoListing.findMany({ where: { userId } }),
      prisma.comment.findMany({ where: { userId } }),
      prisma.contractor.findMany({ where: { userId } }),
    ]);

    res.setHeader('Content-Disposition', 'attachment; filename="assistant-backup.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      user,
      settings,
      tasks,
      deadlines,
      documents,
      spreadsheets,
      presentations,
      aiRequests,
      searchResults,
      videoSummaries,
      avitoListings,
      comments,
      contractors,
    });
  }),
);
