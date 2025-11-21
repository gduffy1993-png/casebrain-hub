import { LRUCache } from "lru-cache";

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

const cache = new LRUCache<string, { count: number; expiresAt: number }>({
  max: 5000,
});

export function assertRateLimit(key: string, options: RateLimitOptions) {
  const existing = cache.get(key);
  const now = Date.now();

  if (existing && existing.expiresAt > now) {
    if (existing.count >= options.limit) {
      const retryAfter = Math.ceil((existing.expiresAt - now) / 1000);
      const error = new Error("Rate limit exceeded");
      (error as Error & { status?: number; retryAfter?: number }).status = 429;
      (error as Error & { status?: number; retryAfter?: number }).retryAfter =
        retryAfter;
      throw error;
    }
    existing.count += 1;
    cache.set(key, existing);
    return;
  }

  cache.set(key, {
    count: 1,
    expiresAt: now + options.windowMs,
  });
}

