import { prisma } from '../db/prisma';

export function getLessonsByCourse(courseId: string) {
  return prisma.lesson.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
  });
}

export function getLessonById(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      tests: {
        select: {
          id: true,
          title: true,
          timeLimitMin: true,
          maxAttempts: true,
          passingScore: true,
        },
      },
      prerequisite: { select: { id: true, title: true } },
    },
  });
}

export function createLesson(data: {
  courseId: string;
  title: string;
  orderIndex: number;
  content?: object[];
  estimatedMinutes?: number;
  isMandatory?: boolean;
  prerequisiteId?: string;
}) {
  return prisma.lesson.create({ data });
}

export function updateLesson(id: string, data: {
  title?: string;
  content?: object[];
  estimatedMinutes?: number;
  isMandatory?: boolean;
  orderIndex?: number;
}) {
  return prisma.lesson.update({ where: { id }, data });
}

export function deleteLesson(id: string) {
  return prisma.lesson.delete({ where: { id } });
}
