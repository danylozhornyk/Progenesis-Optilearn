import { Router } from 'express';
import {
  getTasksByTest,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  setHints,
  removeHints,
  getHintForUser,
} from '../services/tasks.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

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

// ── Admin only ────────────────────────────────────────────────

router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const task = await updateTask(req.params.id, req.body);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await deleteTask(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ── Hint — user-facing (scaffolded) ──────────────────────────

router.get('/:id/hint', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await getHintForUser(req.params.id, req.user!.userId);
    if (result === null) return res.status(404).json({ error: 'Task not found' });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch hint' });
  }
});

// ── Hint management — Admin only ─────────────────────────────

router.put('/:id/hint', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { hints } = req.body;

    if (
      !Array.isArray(hints) ||
      hints.some(
        (h) =>
          typeof h.strength !== 'number' ||
          h.strength < 0 ||
          h.strength > 100 ||
          typeof h.text !== 'string' ||
          h.text.trim() === ''
      )
    ) {
      return res.status(400).json({
        error: 'hints must be an array of { strength: 0–100, text: string }',
      });
    }

    const task = await setHints(req.params.id, hints);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to set hints' });
  }
});

router.delete('/:id/hint', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const task = await removeHints(req.params.id);
    res.json(task);
  } catch {
    res.status(500).json({ error: 'Failed to remove hints' });
  }
});

export default router;
