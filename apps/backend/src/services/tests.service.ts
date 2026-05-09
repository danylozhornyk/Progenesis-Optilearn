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

export async function getTestById(id: string) {
  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      lesson: { select: { id: true, title: true, titleUk: true, course: { select: { id: true } } } },
      tasks: {
        orderBy: { orderIndex: 'asc' },
        include: { graph: true },
      },
    },
  });

  if (test?.shuffleQuestions && test.tasks.length > 1) {
    // Fisher-Yates in-place shuffle
    for (let i = test.tasks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [test.tasks[i], test.tasks[j]] = [test.tasks[j], test.tasks[i]];
    }
  }

  return test;
}

export async function createTest(data: {
  lessonId: string;
  title: string;
  titleUk?: string | null;
  description?: string | null;
  descriptionUk?: string | null;
  timeLimitMin?: number | null;
  maxAttempts?: number | null;
  passingScore?: number;
  shuffleQuestions?: boolean;
}) {
  const test = await prisma.test.create({ data });
  await invalidateTestsCache(data.lessonId);
  return test;
}

export async function updateTest(id: string, data: {
  title?: string;
  titleUk?: string | null;
  description?: string | null;
  descriptionUk?: string | null;
  timeLimitMin?: number | null;
  maxAttempts?: number | null;
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
