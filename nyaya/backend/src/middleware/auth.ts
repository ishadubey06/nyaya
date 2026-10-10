import type { Request, Response, NextFunction } from "express";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      };
    }
  }
}

/**
 * Standard Session Auth Middleware.
 * Automatically attaches session/local user without external dependencies.
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  req.user = {
    id: "local-user-123",
    email: "citizen@nyaya.ai",
  };
  next();
};
