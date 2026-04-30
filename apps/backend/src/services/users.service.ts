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
      avatarUrl: true,
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

/**
 * Computes a user's progress for a single course based on the database state
 * (lessons, tests, passed submissions). The formula:
 *   - A lesson is "completed" iff it has at least one test AND every test in
 *     that lesson has been passed by the user.
 *   - Lessons without any tests are excluded from the denominator (they cannot
 *     be "completed" via testing).
 *   - progressPercent = completedLessons / lessonsWithTests * 100.
 *   - If the course has no testable lessons at all, progressPercent = 0.
 *   - totalScore = sum of every submission's totalScore for this course.
 */
export async function computeCourseProgress(userId: string, courseId: string) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId },
    select: {
      id: true,
      tests: { select: { id: true } },
    },
  });

  const lessonsWithTests = lessons.filter((l) => l.tests.length > 0);
  const totalTestIds = lessons.flatMap((l) => l.tests.map((t) => t.id));

  const passedSubs = totalTestIds.length
    ? await prisma.testSubmission.findMany({
        where: { userId, testId: { in: totalTestIds }, passed: true },
        select: { testId: true },
      })
    : [];
  const passedTestIds = new Set(passedSubs.map((s) => s.testId));

  const completedLessons = lessonsWithTests.filter((l) =>
    l.tests.every((t) => passedTestIds.has(t.id))
  ).length;

  const progressPercent =
    lessonsWithTests.length > 0
      ? (completedLessons / lessonsWithTests.length) * 100
      : 0;

  const courseSubs = await prisma.testSubmission.findMany({
    where: { userId, test: { lesson: { courseId } } },
    select: { totalScore: true },
  });
  const totalScore = courseSubs.reduce(
    (sum, s) => sum + Number(s.totalScore),
    0
  );

  return { progressPercent, totalScore };
}

/**
 * Enrolls a user in a course. Idempotent: if a UserProgress row already exists,
 * its progressPercent / totalScore are recomputed and updated.
 */
export async function enrollUserInCourse(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, status: true },
  });
  if (!course) throw new Error('Course not found');
  if (course.status !== 'PUBLISHED') throw new Error('Course is not available');

  const { progressPercent, totalScore } = await computeCourseProgress(userId, courseId);

  return prisma.userProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: { progressPercent, totalScore, updatedAt: new Date() },
    create: { userId, courseId, progressPercent, totalScore: Math.round(totalScore) },
  });
}

export async function unenrollUserFromCourse(userId: string, courseId: string) {
  await prisma.userProgress.deleteMany({
    where: { userId, courseId },
  });
}

export function getUserProgress(userId: string) {
  return prisma.userProgress.findMany({
    where: { userId },
    include: {
      course: {
        select: { id: true, title: true, titleUk: true, discipline: true, disciplineUk: true, difficulty: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Returns detailed per-course progress for a user across ALL published courses
 * (not just the ones a UserProgress row exists for). For each course:
 *   - totalLessons / completedLessons (lesson with all of its tests passed)
 *   - totalTests / passedTests (tests with at least one passed submission)
 *   - progressPercent (from UserProgress; 0 if no row exists yet)
 */
export async function getDetailedCourseProgress(userId: string) {
  const courses = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    select: {
      id: true,
      title: true,
      titleUk: true,
      discipline: true,
      disciplineUk: true,
      difficulty: true,
      coverImageUrl: true,
      lessons: {
        select: {
          id: true,
          tests: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const allTestIds = courses.flatMap((c) => c.lessons.flatMap((l) => l.tests.map((t) => t.id)));
  const passedSubs = allTestIds.length
    ? await prisma.testSubmission.findMany({
        where: { userId, testId: { in: allTestIds }, passed: true },
        select: { testId: true },
      })
    : [];
  const passedTestIds = new Set(passedSubs.map((s) => s.testId));

  const progressRows = await prisma.userProgress.findMany({
    where: { userId },
    select: { courseId: true, progressPercent: true, totalScore: true },
  });
  const progressByCourse = new Map(progressRows.map((p) => [p.courseId, p]));

  return courses.map((c) => {
    let totalLessons = 0;
    let completedLessons = 0;
    let totalTests = 0;
    let passedTests = 0;

    for (const lesson of c.lessons) {
      totalLessons++;
      totalTests += lesson.tests.length;
      const lessonPassedCount = lesson.tests.filter((t) => passedTestIds.has(t.id)).length;
      passedTests += lessonPassedCount;
      const allLessonTestsPassed =
        lesson.tests.length > 0 && lessonPassedCount === lesson.tests.length;
      if (allLessonTestsPassed) completedLessons++;
    }

    const progress = progressByCourse.get(c.id);

    const enrolled = !!progress;
    const livePercent = totalLessons > 0
      ? (completedLessons / totalLessons) * 100
      : 0;

    // Prefer the stored progress entity (source of truth from user_progress).
    // If the user is enrolled but the stored value is stale relative to live
    // submissions, fall back to the live computation.
    const storedPercent = progress ? Number(progress.progressPercent) : 0;
    const progressPercent = enrolled
      ? Math.max(storedPercent, livePercent)
      : 0;

    let status: 'NOT_ENROLLED' | 'IN_PROGRESS' | 'COMPLETED';
    if (!enrolled) status = 'NOT_ENROLLED';
    else if (progressPercent >= 100) status = 'COMPLETED';
    else status = 'IN_PROGRESS';

    return {
      courseId: c.id,
      title: c.title,
      titleUk: c.titleUk,
      discipline: c.discipline,
      disciplineUk: c.disciplineUk,
      difficulty: c.difficulty,
      coverImageUrl: c.coverImageUrl,
      totalLessons,
      completedLessons,
      totalTests,
      passedTests,
      progressPercent,
      totalScore: progress?.totalScore ?? 0,
      enrolled,
      status,
    };
  });
}

export function updateUser(id: string, data: {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
}) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      avatarUrl: true,
      updatedAt: true,
    },
  });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
