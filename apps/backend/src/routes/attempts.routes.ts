import { Router } from 'express';
import {
  getAttemptsByUser,
  getAttemptsByTask,
  getAttemptById,
  createAttempt,
} from '../services/attempts.service';

const router = Router();

router.get('/user/:userId', async (req, res) => {
  try {
    const attempts = await getAttemptsByUser(req.params.userId);
    res.json(attempts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

router.get('/task/:taskId', async (req, res) => {
  try {
    const attempts = await getAttemptsByTask(req.params.taskId);
    res.json(attempts);
  } catch {
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const attempt = await getAttemptById(req.params.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    res.json(attempt);
  } catch {
    res.status(500).json({ error: 'Failed to fetch attempt' });
  }
});

router.post('/', async (req, res) => {
  try {
    const attempt = await createAttempt(req.body);
    res.status(201).json(attempt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create attempt';
    res.status(500).json({ error: message });
  }
});

export default router;
