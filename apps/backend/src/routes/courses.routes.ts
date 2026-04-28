import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../services/courses.service';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ── Public ────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  try {
    const courses = await getAllCourses();
    res.json(courses);
  } catch {
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const course = await getCourseById(req.params.id);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch {
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// ── Admin only ────────────────────────────────────────────────
router.post('/', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const course = await createCourse(req.body);
    res.status(201).json(course);
  } catch {
    res.status(500).json({ error: 'Failed to create course' });
  }
});

router.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const course = await updateCourse(req.params.id, req.body);
    res.json(course);
  } catch {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

router.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    await deleteCourse(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;