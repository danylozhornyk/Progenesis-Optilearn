import { Router } from 'express';
import {
  getLessonsByCourse,
  getLessonById,
  getLessonByIdPublic,
  createLesson,
  updateLesson,
  deleteLesson,
  getCourseLessonAccess,
  getLessonAccess,
} from '../services/lessons.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.get('/course/:courseId', async (req, res) => {
  try {
    const lessons = await getLessonsByCourse(req.params.courseId);
    res.json(lessons);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
});

// ── Lesson access status for a course (auth required) ─────────
router.get('/course/:courseId/access', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const status = await getCourseLessonAccess(req.user.userId, req.params.courseId);
    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lesson access' });
  }
});

// ── Single-lesson access status (auth required) ───────────────
router.get('/:id/access', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const status = await getLessonAccess(req.user.userId, req.params.id);
    if (!status) return res.status(404).json({ error: 'Lesson not found' });
    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lesson access' });
  }
});

// ── Public without token, full data with token ────────────────
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const isAuthenticated = authHeader?.startsWith('Bearer ');

    const lesson = isAuthenticated
      ? await getLessonById(req.params.id)
      : await getLessonByIdPublic(req.params.id);

    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
    res.json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
});

// ── Admin only ────────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const lesson = await createLesson(req.body);
    res.status(201).json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const lesson = await updateLesson(req.params.id, req.body);
    res.json(lesson);
  } catch {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await deleteLesson(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

export default router;