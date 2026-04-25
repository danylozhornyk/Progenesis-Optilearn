import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { blacklistToken, isTokenBlacklisted } from '../cache/tokens.cache';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';
const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days in seconds

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error('Email already in use');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken(user.id, user.role);
  return { user, token };
}

export async function login(data: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) throw new Error('Invalid email or password');

  const passwordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordValid) throw new Error('Invalid email or password');

  const token = generateToken(user.id, user.role);

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    token,
  };
}

export async function logout(token: string) {
  await blacklistToken(token, JWT_EXPIRES_IN_SECONDS);
}

export function generateToken(userId: string, role: string) {
  return jwt.sign({ userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
}

export async function verifyTokenNotBlacklisted(token: string) {
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) throw new Error('Token has been invalidated');
  return verifyToken(token);
}
