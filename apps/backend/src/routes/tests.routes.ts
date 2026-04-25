import { Router } from 'express';
import {
  getTestsByLesson,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
} from '../services/tests.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.get('/lesson/:lessonId', async (req, res) => {
  try {
    const tests = await getTestsByLesson(req.params.lessonId);
    res.json(tests);
  } catch {
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// ── Authenticated ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const test = await getTestById(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch {
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// ── Teacher / Admin only ──────────────────────────────────────
router.post('/', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const test = await createTest(req.body);
    res.status(201).json(test);
  } catch {
    res.status(500).json({ error: 'Failed to create test' });
  }
});

router.patch('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const test = await updateTest(req.params.id, req.body);
    res.json(test);
  } catch {
    res.status(500).json({ error: 'Failed to update test' });
  }
});

router.delete('/:id', authenticate, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    await deleteTest(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete test' });
  }
});

export default router;
