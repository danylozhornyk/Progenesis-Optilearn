import redis from './redis';

const LESSONS_PREFIX = 'cache:lessons:course:';
const TTL_SECONDS = 60 * 5; // 5 minutes

export async function getCachedLessons(courseId: string): Promise<unknown[] | null> {
  const data = await redis.get(`${LESSONS_PREFIX}${courseId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedLessons(courseId: string, lessons: unknown[]) {
  await redis.set(`${LESSONS_PREFIX}${courseId}`, JSON.stringify(lessons), {
    EX: TTL_SECONDS,
  });
}

export async function invalidateLessonsCache(courseId: string) {
  await redis.del(`${LESSONS_PREFIX}${courseId}`);
}
