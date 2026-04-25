import redis from './redis';

const TESTS_PREFIX = 'cache:tests:lesson:';
const TTL_SECONDS = 60 * 5; // 5 minutes

export async function getCachedTests(lessonId: string): Promise<unknown[] | null> {
  const data = await redis.get(`${TESTS_PREFIX}${lessonId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedTests(lessonId: string, tests: unknown[]) {
  await redis.set(`${TESTS_PREFIX}${lessonId}`, JSON.stringify(tests), {
    EX: TTL_SECONDS,
  });
}

export async function invalidateTestsCache(lessonId: string) {
  await redis.del(`${TESTS_PREFIX}${lessonId}`);
}
