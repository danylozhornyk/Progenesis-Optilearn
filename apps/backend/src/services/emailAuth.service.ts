import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from '../email/mailer';

// ── Token generator ───────────────────────────────────────────
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ═════════════════════════════════════════════════════════════
// EMAIL VERIFICATION
// ═════════════════════════════════════════════════════════════

export async function sendVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, fullName: true, isEmailVerified: true },
  });

  if (!user) throw new Error('User not found');
  if (user.isEmailVerified) throw new Error('Email is already verified');

  // Delete any existing verification tokens for this user
  await prisma.emailVerification.deleteMany({ where: { userId } });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerification.create({
    data: { userId, token, expiresAt },
  });

  await sendVerificationEmail(user.email, user.fullName, token);
}

export async function verifyEmail(token: string) {
  const verification = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!verification) throw new Error('Invalid verification token');

  if (verification.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { token } });
    throw new Error('Verification token has expired. Please request a new one.');
  }

  // Mark email as verified and delete the token
  await prisma.$transaction([
    prisma.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    }),
    prisma.emailVerification.delete({ where: { token } }),
  ]);
}

// ═════════════════════════════════════════════════════════════
// PASSWORD CHANGE (authenticated)
// ═════════════════════════════════════════════════════════════

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) throw new Error('User not found');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new Error('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

// ═════════════════════════════════════════════════════════════
// PASSWORD RESET (unauthenticated)
// ═════════════════════════════════════════════════════════════

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true },
  });

  // Always return success even if email not found
  // to prevent email enumeration attacks
  if (!user) return;

  // Delete any existing reset tokens
  await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordReset.create({
    data: { userId: user.id, token, expiresAt },
  });

  await sendPasswordResetEmail(user.email, user.fullName, token);
}

export async function resetPassword(token: string, newPassword: string) {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const reset = await prisma.passwordReset.findUnique({
    where: { token },
  });

  if (!reset) throw new Error('Invalid or expired reset token');
  if (reset.used) throw new Error('This reset link has already been used');
  if (reset.expiresAt < new Date()) {
    await prisma.passwordReset.delete({ where: { token } });
    throw new Error('Reset token has expired. Please request a new one.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.update({
      where: { token },
      data: { used: true },
    }),
  ]);
}
