import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../services/courses.service';
import { enrollUserInCourse, unenrollUserFromCourse, computeCourseProgress } from '../services/users.service';
import { prisma } from '../db/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Enrollment status (auth required) ────────────────────────
router.get('/:id/enrollment', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.params.id;
    const row = await prisma.userProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { progressPercent: true, totalScore: true, updatedAt: true },
    });
    if (!row) return res.json({ enrolled: false });
    res.json({
      enrolled: true,
      progressPercent: Number(row.progressPercent),
      totalScore: row.totalScore,
      updatedAt: row.updatedAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch enrollment' });
  }
});

// ── Enroll (auth required, idempotent) ───────────────────────
router.post('/:id/enroll', authenticate, async (req: AuthRequest, res) => {
  try {
    const enrollment = await enrollUserInCourse(req.user!.userId, req.params.id);
    res.status(201).json({
      enrolled: true,
      progressPercent: Number(enrollment.progressPercent),
      totalScore: enrollment.totalScore,
      updatedAt: enrollment.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to enroll';
    res.status(400).json({ error: message });
  }
});

// ── Unenroll (auth required) ─────────────────────────────────
router.delete('/:id/enroll', authenticate, async (req: AuthRequest, res) => {
  try {
    await unenrollUserFromCourse(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to unenroll' });
  }
});

// ── Recompute (auth required) — refresh progressPercent ──────
// Useful after passing a test in another tab, etc.
router.post('/:id/recompute-progress', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;
    const courseId = req.params.id;
    const exists = await prisma.userProgress.findUnique({
      where: { userId_courseId: { userId, courseId } },
      select: { courseId: true },
    });
    if (!exists) return res.status(404).json({ error: 'Not enrolled' });

    const { progressPercent, totalScore } = await computeCourseProgress(userId, courseId);
    const updated = await prisma.userProgress.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progressPercent, totalScore: Math.round(totalScore) },
    });
    res.json({
      enrolled: true,
      progressPercent: Number(updated.progressPercent),
      totalScore: updated.totalScore,
      updatedAt: updated.updatedAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to recompute progress' });
  }
});

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