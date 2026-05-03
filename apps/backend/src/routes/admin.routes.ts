import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { authenticate, requireRole } from '../middleware/auth.middleware';
import { getAdminStats } from '../services/stats.service';

/**
 * Admin-only routes mounted at /admin.
 *
 *   GET    /admin/stats           — aggregate dashboard data
 *   POST   /admin/users           — create a user with a chosen role
 *
 * Course / user list / update / delete endpoints already live in their
 * own routers (`/courses`, `/users`) and are protected by `requireRole('ADMIN')`
 * where appropriate.
 */
const router = Router();

// Every route in this router requires an authenticated admin.
router.use(authenticate, requireRole('ADMIN'));

// ── GET /admin/stats ──────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (e) {
    console.error('[admin/stats]', e);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

// ── GET /admin/courses — every course regardless of status ────
router.get('/courses', async (_req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: { author: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(courses);
  } catch (e) {
    console.error('[admin/courses]', e);
    res.status(500).json({ error: 'Failed to load courses' });
  }
});

// ── GET /admin/lessons — every lesson + its course ────────────
router.get('/lessons', async (_req, res) => {
  try {
    const lessons = await prisma.lesson.findMany({
      select: {
        id: true,
        title: true,
        titleUk: true,
        orderIndex: true,
        isMandatory: true,
        estimatedMinutes: true,
        prerequisiteId: true,
        createdAt: true,
        course: { select: { id: true, title: true, titleUk: true } },
        _count:  { select: { tests: true } },
      },
      orderBy: [{ courseId: 'asc' }, { orderIndex: 'asc' }],
    });
    res.json(lessons);
  } catch (e) {
    console.error('[admin/lessons]', e);
    res.status(500).json({ error: 'Failed to load lessons' });
  }
});

// ── GET /admin/tests — every test + its lesson and course ─────
router.get('/tests', async (_req, res) => {
  try {
    const tests = await prisma.test.findMany({
      select: {
        id: true,
        title: true,
        titleUk: true,
        description: true,
        descriptionUk: true,
        timeLimitMin: true,
        maxAttempts: true,
        passingScore: true,
        shuffleQuestions: true,
        createdAt: true,
        lesson: {
          select: {
            id: true,
            title: true,
            titleUk: true,
            orderIndex: true,
            course: { select: { id: true, title: true, titleUk: true } },
          },
        },
        _count: { select: { tasks: true, submissions: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json(tests);
  } catch (e) {
    console.error('[admin/tests]', e);
    res.status(500).json({ error: 'Failed to load tests' });
  }
});

// ── POST /admin/users — create a user with chosen role ────────
router.post('/users', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body as {
      email?: string;
      password?: string;
      fullName?: string;
      role?: 'STUDENT' | 'ADMIN';
    };

    if (!email || !password || !fullName) {
      return res
        .status(400)
        .json({ error: 'email, password and fullName are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: role ?? 'STUDENT',
        // Admin-created accounts are pre-verified — no email gate needed.
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (e) {
    console.error('[admin POST /users]', e);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;
