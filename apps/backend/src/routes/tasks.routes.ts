import { Router } from 'express';
import {
  getTasksByTest,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  setHint,
  removeHint,
} from '../services/tasks.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ── Authenticated ─────────────────────────────────────────────

router.get('/test/:testId', authenticate, async (req, res) => {
  try {
    const tasks = await getTasksByTest(req.params.testId);
    res.json(tasks);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// ── Teacher / Admin only ──────────────────────────────────────

router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const task = await updateTask(req.params.id, req.body);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    await deleteTask(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ── Hint management — Teacher / Admin only ────────────────────

router.put('/:id/hint', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { hint } = req.body;

    if (!hint || typeof hint !== 'string') {
      return res.status(400).json({ error: 'hint string is required' });
    }

    const task = await setHint(req.params.id, hint);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to set hint' });
  }
});

router.delete('/:id/hint', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const task = await removeHint(req.params.id);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to remove hint' });
  }
});

export default router;
