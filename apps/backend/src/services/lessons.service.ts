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

export function getLessonByIdPublic(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      course: { select: { id: true, title: true } },
      prerequisite: { select: { id: true, title: true } },
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

export async function deleteLesson(id: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { courseId: true },
  });
  await prisma.lesson.delete({ where: { id } });
  if (lesson) await invalidateLessonsCache(lesson.courseId);
}
