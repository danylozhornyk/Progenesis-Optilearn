import { prisma } from '../db/prisma';

export function getTestsByLesson(lessonId: string) {
  return prisma.test.findMany({
    where: { lessonId },
    include: {
      _count: { select: { tasks: true } },
    },
  });
}

export function getTestById(id: string) {
  return prisma.test.findUnique({
    where: { id },
    include: {
      lesson: { select: { id: true, title: true } },
      tasks: {
        orderBy: { orderIndex: 'asc' },
        include: {
          hints: { orderBy: { orderIndex: 'asc' } },
          graph: true,
        },
      },
    },
  });
}

export function createTest(data: {
  lessonId: string;
  title: string;
  description?: string;
  timeLimitMin?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
}) {
  return prisma.test.create({ data });
}

export function updateTest(id: string, data: {
  title?: string;
  description?: string;
  timeLimitMin?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
}) {
  return prisma.test.update({ where: { id }, data });
}

export function deleteTest(id: string) {
  return prisma.test.delete({ where: { id } });
}
