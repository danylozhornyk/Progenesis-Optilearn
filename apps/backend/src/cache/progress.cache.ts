import redis from './redis';

const PROGRESS_PREFIX = 'cache:progress:';
const TTL_SECONDS = 60 * 2; // 2 minutes — progress changes often

export async function getCachedUserProgress(
  userId: string
): Promise<unknown[] | null> {
  const data = await redis.get(`${PROGRESS_PREFIX}${userId}`);
  if (!data) return null;
  return JSON.parse(data);
}

export async function setCachedUserProgress(
  userId: string,
  progress: unknown[]
) {
  await redis.set(
    `${PROGRESS_PREFIX}${userId}`,
    JSON.stringify(progress),
    { EX: TTL_SECONDS }
  );
}

export async function invalidateUserProgressCache(userId: string) {
  await redis.del(`${PROGRESS_PREFIX}${userId}`);
}
