import type { Role } from '@assistant/shared';

declare global {
  namespace Express {
    interface Request {
      /** Заполняется middleware requireAuth из JWT. */
      userId?: string;
      userRole?: Role;
    }
  }
}

export {};
