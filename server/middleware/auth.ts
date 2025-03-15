import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import bcrypt from "bcryptjs";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Checking authentication:', req.session?.userId);

  if (!req.session.userId) {
    console.log('No userId in session');
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await storage.getUserById(req.session.userId);
  console.log('Found user:', user?.username);

  if (!user) {
    console.log('User not found for id:', req.session.userId);
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

export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  const { username, password } = req.body;

  console.log('Login attempt for username:', username);

  try {
    const user = await storage.getUser(username);
    console.log('User found:', user?.username, 'Checking password...');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login time
    await storage.updateUserLastLogin(user.id);

    // Set session
    req.session.userId = user.id;
    console.log('Session set with userId:', user.id);

    // Return user info
    return res.json({
      username: user.username,
      role: user.role,
      forcePasswordChange: user.forcePasswordChange,
      analysis_model: user.analysis_model || "gpt-4o",
      code_gen_model: user.code_gen_model || "gpt-4o"
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
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