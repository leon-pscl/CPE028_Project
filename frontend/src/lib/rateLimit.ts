interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

function refill(key: string, capacity: number, refillRate: number): Bucket {
  const now = Date.now();
  const bucket = buckets.get(key) || { tokens: capacity, lastRefill: now };
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;
  buckets.set(key, bucket);
  return bucket;
}

export function checkRateLimit(
  key: string,
  capacity: number = 10,
  refillRate: number = 1
): boolean {
  const bucket = refill(key, capacity, refillRate);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }
  return false;
}

export function canRefetch(key: string, cooldownMs: number): boolean {
  const now = Date.now();
  const last = buckets.get(key);
  if (!last) {
    buckets.set(key, { tokens: 1, lastRefill: now });
    return true;
  }
  if (now - last.lastRefill >= cooldownMs) {
    buckets.set(key, { tokens: 1, lastRefill: now });
    return true;
  }
  return false;
}

export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
