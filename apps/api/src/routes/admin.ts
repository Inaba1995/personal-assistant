import { Router, type Request, type Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { prisma } from '../prisma';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const adminRouter = Router();

/* GET /admin/users — только для роли ADMIN (USER → 403). */
adminRouter.get(
  '/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { tasks: true, documents: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ items: users });
  }),
);
