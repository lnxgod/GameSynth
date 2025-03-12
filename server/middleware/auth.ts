import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await storage.getUserById(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Add user to request object with default values for model preferences
  (req as any).user = {
    ...user,
    analysis_model: user.analysis_model || "gpt-4o",
    code_gen_model: user.code_gen_model || "gpt-4o"
  };

  next();
};

export const requirePasswordChange = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user.forcePasswordChange) {
    return res.status(403).json({ 
      error: "Password change required",
      requiresPasswordChange: true 
    });
  }
  next();
};