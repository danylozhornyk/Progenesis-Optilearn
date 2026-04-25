import redis from './redis';

const RATE_LIMIT_PREFIX = 'ratelimit:';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

// ── General rate limiter ──────────────────────────────────────
// key      — unique identifier e.g. userId or IP address
// action   — the action being limited e.g. 'login', 'submit'
// limit    — max requests allowed in the window
// windowSec — time window in seconds
export async function checkRateLimit(
  key: string,
  action: string,
  limit: number,
  windowSec: number
): Promise<RateLimitResult> {
  const redisKey = `${RATE_LIMIT_PREFIX}${action}:${key}`;

  const current = await redis.incr(redisKey);

  // Set expiry only on first request in the window
  if (current === 1) {
    await redis.expire(redisKey, windowSec);
  }

  const ttl = await redis.ttl(redisKey);
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current <= limit,
    remaining,
    resetInSeconds: ttl,
  };
}

// ── Specific rate limit presets ───────────────────────────────

// Login — 10 attempts per 15 minutes per IP
export async function checkLoginRateLimit(
  ip: string
): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'login', 20, 60 * 5);
}

// Register — 5 attempts per hour per IP
export async function checkRegisterRateLimit(
  ip: string
): Promise<RateLimitResult> {
  return checkRateLimit(ip, 'register', 20, 60 * 30);
}

// Test submission — 30 submissions per hour per user
export async function checkSubmissionRateLimit(
  userId: string
): Promise<RateLimitResult> {
  return checkRateLimit(userId, 'submission', 30, 60 * 60);
}
