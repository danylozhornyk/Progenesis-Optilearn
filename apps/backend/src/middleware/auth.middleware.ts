import { Request, Response, NextFunction } from 'express';
import { verifyTokenNotBlacklisted } from '../services/auth.service';
import {
  checkLoginRateLimit,
  checkRegisterRateLimit,
  checkSubmissionRateLimit,
} from '../cache/rateLimit.cache';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// ── Authenticate — checks token + blacklist ───────────────────
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await verifyTokenNotBlacklisted(token);
    req.user = decoded;
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid or expired token';
    return res.status(401).json({ error: message });
  }
}

// ── Role guard ────────────────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// ── Rate limit middleware ─────────────────────────────────────
export async function loginRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await checkLoginRateLimit(ip);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
      resetInSeconds: result.resetInSeconds,
    });
  }

  next();
}

export async function registerRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const result = await checkRegisterRateLimit(ip);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many registration attempts. Please try again later.',
      resetInSeconds: result.resetInSeconds,
    });
  }

  next();
}

export async function submissionRateLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) return next();

  const result = await checkSubmissionRateLimit(req.user.userId);

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many submissions. Please slow down.',
      resetInSeconds: result.resetInSeconds,
    });
  }

  next();
}
