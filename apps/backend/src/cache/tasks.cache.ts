import redis from './redis';

const TASKS_PREFIX = 'cache:tasks:test:';
const TTL_SECONDS = 60 * 10; // 10 minutes

export async function getCachedTasks(testId: string): Promise<unknown[] | null> {
  const data = await redis.get(`${TASKS_PREFIX}${testId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedTasks(testId: string, tasks: unknown[]) {
  await redis.set(`${TASKS_PREFIX}${testId}`, JSON.stringify(tasks), {
    EX: TTL_SECONDS,
  });
}

export async function invalidateTasksCache(testId: string) {
  await redis.del(`${TASKS_PREFIX}${testId}`);
}
