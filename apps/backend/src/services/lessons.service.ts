import { prisma } from '../db/prisma';
import {
  getCachedLessons,
  setCachedLessons,
  invalidateLessonsCache,
} from '../cache/lessons.cache';

export async function getLessonsByCourse(courseId: string) {
  const cached = await getCachedLessons(courseId);
  if (cached) return cached;

  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
  });

  await setCachedLessons(courseId, lessons);
  return lessons;
}

export function getLessonById(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, titleUk: true } },
      tests: {
        select: {
          id: true,
          title: true,
          titleUk: true,
          description: true,
          descriptionUk: true,
          timeLimitMin: true,
          maxAttempts: true,
          passingScore: true,
        },
      },
      prerequisite: { select: { id: true, title: true, titleUk: true } },
    },
  });
}

export function getLessonByIdPublic(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true, titleUk: true } },
      prerequisite: { select: { id: true, title: true, titleUk: true } },
    },
  });
}

export async function createLesson(data: {
  courseId: string;
  title: string;
  orderIndex: number;
  content?: object[];
  estimatedMinutes?: number;
  isMandatory?: boolean;
  prerequisiteId?: string;
}) {
  const lesson = await prisma.lesson.create({ data });
  await invalidateLessonsCache(data.courseId);
  return lesson;
}

export async function updateLesson(id: string, data: {
  title?: string;
  content?: object[];
  estimatedMinutes?: number;
  isMandatory?: boolean;
  orderIndex?: number;
}) {
  const lesson = await prisma.lesson.update({ where: { id }, data });
  await invalidateLessonsCache(lesson.courseId);
  return lesson;
}

/**
 * Returns per-lesson access status for a user in a course.
 *
 * Rule: lesson N is unlocked iff every MANDATORY lesson before N has all
 * of its tests passed by the user. Lessons without tests count as passed.
 * Optional lessons do not block progression.
 */
export async function getCourseLessonAccess(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      orderIndex: true,
      isMandatory: true,
      tests: { select: { id: true } },
    },
  });

  const testIds = lessons.flatMap((l) => l.tests.map((t) => t.id));
  const passedSubs = testIds.length > 0
    ? await prisma.testSubmission.findMany({
        where: { userId, testId: { in: testIds }, passed: true },
        select: { testId: true },
      })
    : [];
  const passedTestIds = new Set(passedSubs.map((s) => s.testId));

  const result: {
    lessonId: string;
    orderIndex: number;
    testCount: number;
    passedTestCount: number;
    allTestsPassed: boolean;
    unlocked: boolean;
  }[] = [];

  let prevMandatoryAllPassed = true; // first lesson is always unlocked
  for (const lesson of lessons) {
    const passedCount = lesson.tests.filter((t) => passedTestIds.has(t.id)).length;
    const allTestsPassed = lesson.tests.length === 0 || passedCount === lesson.tests.length;
    const unlocked = prevMandatoryAllPassed;

    result.push({
      lessonId: lesson.id,
      orderIndex: lesson.orderIndex,
      testCount: lesson.tests.length,
      passedTestCount: passedCount,
      allTestsPassed,
      unlocked,
    });

    if (lesson.isMandatory) {
      prevMandatoryAllPassed = prevMandatoryAllPassed && allTestsPassed;
    }
  }

  return result;
}

/**
 * Returns access info for a single lesson by id for a given user.
 * Includes the same `unlocked` rule as getCourseLessonAccess plus the previous
 * mandatory lesson's id (if any) so the frontend can prompt the user where to go.
 */
export async function getLessonAccess(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { courseId: true },
  });
  if (!lesson) return null;

  const all = await getCourseLessonAccess(userId, lesson.courseId);
  const idx = all.findIndex((l) => l.lessonId === lessonId);
  if (idx < 0) return null;

  // Find the most recent previous MANDATORY lesson that isn't fully passed
  let blockingLessonId: string | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    const prev = all[i];
    if (!prev.allTestsPassed) {
      // need to check if it's mandatory too — re-fetch isMandatory
      const prevLesson = await prisma.lesson.findUnique({
        where: { id: prev.lessonId },
        select: { isMandatory: true },
      });
      if (prevLesson?.isMandatory) {
        blockingLessonId = prev.lessonId;
        break;
      }
    }
  }

  return {
    ...all[idx],
    blockingLessonId,
  };
}

export async function deleteLesson(id: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { courseId: true },
  });
  await prisma.lesson.delete({ where: { id } });
  if (lesson) await invalidateLessonsCache(lesson.courseId);
}
