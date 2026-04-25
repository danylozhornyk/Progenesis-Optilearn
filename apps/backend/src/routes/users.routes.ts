import { Router } from 'express';
import {
  getUserById,
  updateUserPreferences,
  updateUser,
  deleteUser,
  getUserProgress,
} from '../services/users.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// ── Authenticated ─────────────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Students can only view their own profile
    if (
      req.user!.role === 'STUDENT' &&
      req.user!.userId !== req.params.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.patch('/:id/preferences', authenticate, async (req: AuthRequest, res) => {
  try {
    // Users can only update their own preferences
    if (req.user!.userId !== req.params.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await updateUserPreferences(req.params.id, req.body);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/:id/progress', authenticate, async (req: AuthRequest, res) => {
  try {
    // Students can only view their own progress
    if (
      req.user!.role === 'STUDENT' &&
      req.user!.userId !== req.params.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const progress = await getUserProgress(req.params.id);
    res.json(progress);
  } catch {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// ── Admin only ────────────────────────────────────────────────
router.patch('/:id/role', authenticate, requireRole('ADMIN'), async (req, res) => {
  try {
    const { prisma } = await import('../db/prisma');
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: req.body.role },
      select: { id: true, email: true, fullName: true, role: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ── Authenticated — user updates own profile ──────────────────
router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Users can update their own profile, admins can update anyone
    if (
      req.user!.role !== 'ADMIN' &&
      req.user!.userId !== req.params.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await updateUser(req.params.id, req.body);
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ── Authenticated — user deletes own account ──────────────────
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Users can only delete their own account unless admin
    if (
      req.user!.role !== 'ADMIN' &&
      req.user!.userId !== req.params.id
    ) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await deleteUser(req.params.id);
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ── Admin only — get all users ────────────────────────────────
router.get('/', authenticate, requireRole('ADMIN'), async (_req, res) => {
  try {
    const { prisma } = await import('../db/prisma');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
