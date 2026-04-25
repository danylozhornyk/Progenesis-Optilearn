import { Router } from 'express';
import {
  generateAndSaveRecommendation,
  getRecommendationsByUser,
  getLatestRecommendation,
} from '../services/recommendations.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Student requests a new analysis ──────────────────────────
router.post('/generate', authenticate, async (req: AuthRequest, res) => {
  try {
    const recommendation = await generateAndSaveRecommendation(
      req.user!.userId,
    );
    res.status(201).json(recommendation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate recommendation';
    res.status(500).json({ error: message });
  }
});

// ── Get all recommendations ───────────────────────────────────
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    const recommendations = await getRecommendationsByUser(req.user!.userId);
    res.json(recommendations);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// ── Get latest recommendation ─────────────────────────────────
router.get('/my/latest', authenticate, async (req: AuthRequest, res) => {
  try {
    const recommendation = await getLatestRecommendation(req.user!.userId);
    if (!recommendation) {
      return res.status(404).json({ error: 'No recommendations yet. Submit some tests first.' });
    }
    res.json(recommendation);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recommendation' });
  }
});

export default router;