type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function getPublicReservationClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headers.get('x-real-ip')?.trim();
  const cfIp = headers.get('cf-connecting-ip')?.trim();
  return forwarded || realIp || cfIp || 'unknown';
}

export function consumePublicReservationAttempt(ip: string): { ok: true } | { ok: false } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= MAX_ATTEMPTS) {
    return { ok: false };
  }
  bucket.count += 1;
  return { ok: true };
}

