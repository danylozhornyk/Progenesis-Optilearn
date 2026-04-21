import { Router } from 'express';
import {
  getAchievementsByUser,
  awardAchievement,
} from '../services/achievements.service';

const router = Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const achievements = await getAchievementsByUser(req.params.userId);
    res.json(achievements);
  } catch {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

router.post('/', async (req, res) => {
  try {
    const achievement = await awardAchievement(req.body);
    res.status(201).json(achievement);
  } catch {
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

export default router;
