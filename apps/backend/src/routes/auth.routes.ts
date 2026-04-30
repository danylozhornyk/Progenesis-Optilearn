import { Router } from 'express';
import { register, login, logout } from '../services/auth.service';
import {
  sendVerification,
  verifyEmail,
  changePassword,
  changeEmail,
  requestPasswordReset,
  resetPassword,
} from '../services/emailAuth.service';
import {
  authenticate,
  loginRateLimit,
  registerRateLimit,
  AuthRequest,
} from '../middleware/auth.middleware';
import { prisma } from '../db/prisma';

const router = Router();

// ── Register — sends verification email automatically ─────────
router.post('/register', registerRateLimit, async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({
        error: 'email, password and fullName are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    const result = await register({ email, password, fullName });

    // Send verification email after successful registration
    await sendVerification(result.user.id);

    res.status(201).json({
      ...result,
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

// ── Login ─────────────────────────────────────────────────────
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await login({ email, password });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

// ── Logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization!.split(' ')[1];
    await logout(token);
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── Get current user ──────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isEmailVerified: true,
        avatarUrl: true,
        preferences: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── Resend verification email ─────────────────────────────────
router.post('/resend-verification', authenticate, async (req: AuthRequest, res) => {
  try {
    await sendVerification(req.user!.userId);
    res.json({ message: 'Verification email sent. Please check your inbox.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send verification email';
    res.status(400).json({ error: message });
  }
});

// ── Verify email via token ────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    await verifyEmail(token);
    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    res.status(400).json({ error: message });
  }
});

// ── Change email (authenticated) — sends verification to new email ──
router.post('/change-email', authenticate, async (req: AuthRequest, res) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail) return res.status(400).json({ error: 'newEmail is required' });

    await changeEmail(req.user!.userId, newEmail);
    res.json({
      message: 'Email updated. Please check your new inbox to verify it.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change email';
    res.status(400).json({ error: message });
  }
});

// ── Change password (authenticated) ──────────────────────────
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'currentPassword and newPassword are required',
      });
    }

    await changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to change password';
    res.status(400).json({ error: message });
  }
});

// ── Request password reset ────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  } catch {
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ── Reset password via token ──────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'token and newPassword are required' });
    }

    await resetPassword(token, newPassword);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset password';
    res.status(400).json({ error: message });
  }
});

export default router;
