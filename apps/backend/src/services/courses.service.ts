import { prisma } from '../db/prisma';
import {
  getCachedCourses,
  setCachedCourses,
  getCachedCourse,
  setCachedCourse,
  invalidateCourseCache,
  invalidateCoursesCache,
} from '../cache/courses.cache';

export async function getAllCourses() {
  // Try cache first
  const cached = await getCachedCourses();
  if (cached) return cached;

  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED', isVisible: true },
    include: { author: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });

  await setCachedCourses(courses);
  return courses;
}

export async function getCourseById(id: string) {
  // Try cache first
  const cached = await getCachedCourse(id);
  if (cached) return cached;

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, fullName: true } },
      lessons: { orderBy: { orderIndex: 'asc' } },
    },
  });

  if (course) await setCachedCourse(id, course);
  return course;
}

export async function createCourse(data: {
  authorId: string;
  title: string;
  description: string;
  discipline: string;
  difficulty: string;
  status?: string;
  isVisible?: boolean;
  coverImageUrl?: string;
}) {
  const course = await prisma.course.create({ data });
  await invalidateCoursesCache();
  return course;
}

export async function updateCourse(id: string, data: object) {
  const course = await prisma.course.update({
    where: { id },
    data,
  });
  await invalidateCourseCache(id);
  return course;
}

export async function deleteCourse(id: string) {
  await prisma.course.delete({ where: { id } });
  await invalidateCourseCache(id);
}
