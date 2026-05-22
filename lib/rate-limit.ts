import { hasDatabase, getPrisma } from "./prisma";

type RateLimitInput = {
  namespace: string;
  key: string;
  limit: number;
  windowMs?: number;
};

type Bucket = {
  count: number;
  resetAt: string;
};

const globalForRateLimit = globalThis as unknown as {
  kyaRateLimits?: Map<string, Bucket>;
};

function memoryBuckets() {
  globalForRateLimit.kyaRateLimits ??= new Map();
  return globalForRateLimit.kyaRateLimits;
}

export async function checkRateLimit({
  namespace,
  key,
  limit,
  windowMs = 60_000
}: RateLimitInput) {
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const bucketKey = `${namespace}:${key}:${windowId}`;
  const resetAt = new Date((windowId + 1) * windowMs).toISOString();

  if (!hasDatabase()) {
    const buckets = memoryBuckets();
    const current = buckets.get(bucketKey) ?? { count: 0, resetAt };
    current.count += 1;
    current.resetAt = resetAt;
    buckets.set(bucketKey, current);
    return {
      allowed: current.count <= limit,
      remaining: Math.max(0, limit - current.count),
      resetAt
    };
  }

  const prisma = getPrisma();
  const existing = await prisma.kyaKv.findUnique({
    where: { namespace_key: { namespace: "rate_limit", key: bucketKey } }
  });
  const current = ((existing?.value as Bucket | null) ?? { count: 0, resetAt }) as Bucket;
  const next = { count: Number(current.count ?? 0) + 1, resetAt };

  await prisma.kyaKv.upsert({
    where: { namespace_key: { namespace: "rate_limit", key: bucketKey } },
    create: { namespace: "rate_limit", key: bucketKey, value: next },
    update: { value: next }
  });

  return {
    allowed: next.count <= limit,
    remaining: Math.max(0, limit - next.count),
    resetAt
  };
}
