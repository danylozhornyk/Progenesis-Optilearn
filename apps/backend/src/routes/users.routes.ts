import { Router } from 'express';
import {
  getUserById,
  updateUserPreferences,
  getUserProgress,
} from '../services/users.service';

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id/preferences', async (req, res) => {
  try {
    const updated = await updateUserPreferences(req.params.id, req.body);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/:id/progress', async (req, res) => {
  try {
    const progress = await getUserProgress(req.params.id);
    res.json(progress);
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

export default router;
