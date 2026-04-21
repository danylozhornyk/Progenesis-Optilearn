import { prisma } from '../db/prisma';

export function getAllCourses() {
  return prisma.course.findMany({
    where: { status: 'PUBLISHED', isVisible: true },
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function getCourseById(id: string) {
  return prisma.course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, fullName: true } },
      lessons: { orderBy: { orderIndex: 'asc' } },
    },
  });
}