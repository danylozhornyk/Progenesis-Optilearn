import { prisma } from '../db/prisma';

export function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      isEmailVerified: true,
      preferences: true,
      createdAt: true,
    },
  });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function createUser(data: {
  email: string;
  passwordHash: string;
  fullName: string;
}) {
  return prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
    },
  });
}

export function updateUserPreferences(id: string, preferences: object) {
  return prisma.user.update({
    where: { id },
    data: { preferences },
    select: {
      id: true,
      preferences: true,
    },
  });
}

export function getUserProgress(userId: string) {
  return prisma.userProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: { id: true, title: true, discipline: true, difficulty: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}
