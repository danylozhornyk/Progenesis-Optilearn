import redis from './redis';

const BLACKLIST_PREFIX = 'blacklist:';

// ── Blacklist a token on logout ───────────────────────────────
// expiresIn should match the JWT expiry (in seconds)
// so the key auto-expires from Redis when the token would have
// expired anyway — no manual cleanup needed
export async function blacklistToken(
  token: string,
  expiresInSeconds: number
) {
  const key = `${BLACKLIST_PREFIX}${token}`;
  await redis.set(key, '1', { EX: expiresInSeconds });
}

// ── Check if a token has been blacklisted ─────────────────────
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = `${BLACKLIST_PREFIX}${token}`;
  const value = await redis.get(key);
  return value !== null;
}
