import { prisma } from '../db/prisma';
import {
  getCachedTests,
  setCachedTests,
  invalidateTestsCache,
} from '../cache/tests.cache';

export async function getTestsByLesson(lessonId: string) {
  const cached = await getCachedTests(lessonId);
  if (cached) return cached;

  const tests = await prisma.test.findMany({
    where: { lessonId },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  await setCachedTests(lessonId, tests);
  return tests;
}

export function getTestById(id: string) {
  return prisma.test.findUnique({
    where: { id },
    include: {
      lesson: { select: { id: true, title: true } },
      tasks: {
        orderBy: { orderIndex: 'asc' },
        include: { graph: true },
      },
    },
  });
}

export async function createTest(data: {
  lessonId: string;
  title: string;
  description?: string;
  timeLimitMin?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
}) {
  const test = await prisma.test.create({ data });
  await invalidateTestsCache(data.lessonId);
  return test;
}

export async function updateTest(id: string, data: {
  title?: string;
  description?: string;
  timeLimitMin?: number;
  maxAttempts?: number;
  passingScore?: number;
  shuffleQuestions?: boolean;
}) {
  const test = await prisma.test.update({ where: { id }, data });
  await invalidateTestsCache(test.lessonId);
  return test;
}

export async function deleteTest(id: string) {
  const test = await prisma.test.findUnique({
    where: { id },
    select: { lessonId: true },
  });
  await prisma.task.deleteMany({ where: { testId: id } });
  await prisma.test.delete({ where: { id } });
  if (test) await invalidateTestsCache(test.lessonId);
}
