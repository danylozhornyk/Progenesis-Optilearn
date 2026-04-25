import redis from './redis';

const COURSES_KEY = 'cache:courses:published';
const COURSE_KEY_PREFIX = 'cache:course:';
const TTL_SECONDS = 60 * 5; // 5 minutes

// ── Cache all published courses ───────────────────────────────
export async function getCachedCourses(): Promise<unknown[] | null> {
  const data = await redis.get(COURSES_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedCourses(courses: unknown[]) {
  await redis.set(COURSES_KEY, JSON.stringify(courses), {
    EX: TTL_SECONDS,
  });
}

export async function invalidateCoursesCache() {
  await redis.del(COURSES_KEY);
}

// ── Cache a single course ─────────────────────────────────────
export async function getCachedCourse(id: string): Promise<unknown | null> {
  const data = await redis.get(`${COURSE_KEY_PREFIX}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedCourse(id: string, course: unknown) {
  await redis.set(`${COURSE_KEY_PREFIX}${id}`, JSON.stringify(course), {
    EX: TTL_SECONDS,
  });
}

export async function invalidateCourseCache(id: string) {
  await Promise.all([
    redis.del(`${COURSE_KEY_PREFIX}${id}`),
    redis.del(COURSES_KEY), // also bust the list cache
  ]);
}
