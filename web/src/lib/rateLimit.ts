import { NextRequest } from 'next/server';

// Global state for rate limiting (persists across hot-reloads in dev)
const globalWithRateLimit = global as typeof globalThis & {
  rateLimitMap?: Map<string, { count: number; resetAt: number }>;
};

if (!globalWithRateLimit.rateLimitMap) {
  globalWithRateLimit.rateLimitMap = new Map();
}

const rateLimitMap = globalWithRateLimit.rateLimitMap;

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Checks if a request from a specific IP to a specific endpoint exceeds limits.
 * @returns boolean true if rate limited, false if allowed
 */
export function isRateLimited(
  ip: string,
  endpoint: string,
  config: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 }
): boolean {
  const now = Date.now();
  const key = `${ip}:${endpoint}`;
  const limit = rateLimitMap.get(key);

  if (!limit) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  if (now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  if (limit.count >= config.maxRequests) {
    return true;
  }

  limit.count += 1;
  return false;
}

/**
 * Helper to get the client IP address from request headers.
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return '127.0.0.1';
}
