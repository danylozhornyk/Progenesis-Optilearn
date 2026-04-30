import { Router } from 'express';
import {
  getAchievementsByUser,
  awardAchievement,
  getAchievementDefinitions,
} from '../services/achievements.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Public — list of all achievement definitions ──────────────
router.get('/definitions', (_req, res) => {
  try {
    res.json(getAchievementDefinitions());
  } catch {
    res.status(500).json({ error: 'Failed to fetch achievement definitions' });
  }
});

// ── Authenticated ─────────────────────────────────────────────
router.get('/user/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    // Students can only see their own achievements
    if (
      req.user!.role === 'STUDENT' &&
      req.user!.userId !== req.params.userId
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const achievements = await getAchievementsByUser(req.params.userId);
    res.json(achievements);
  } catch {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// ── Admin only ────────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const achievement = await awardAchievement(req.body);
    res.status(201).json(achievement);
  } catch {
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

export default router;
