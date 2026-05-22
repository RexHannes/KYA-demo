import { randomBytes } from "node:crypto";
import { DEFAULT_API_KEY_SCOPES, hashApiKey } from "./auth";
import { getClientIp, getUserAgent } from "./http";
import { getPrisma } from "./prisma";

export function generateApiKey() {
  const raw = `kya_demo_${randomBytes(24).toString("base64url")}`;
  return raw;
}

export type CreateApiKeyInput = {
  label: string;
  scopes?: string[];
  expiresAt?: Date | null;
  rateLimitPerMinute?: number | null;
};

export async function createIntegratorApiKey({
  label,
  scopes = DEFAULT_API_KEY_SCOPES,
  expiresAt = null,
  rateLimitPerMinute = null
}: CreateApiKeyInput) {
  const prisma = getPrisma();
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 16);

  const row = await prisma.kyaApiKey.create({
    data: { label, keyHash, keyPrefix, scopes, expiresAt, rateLimitPerMinute }
  });

  return {
    id: row.id,
    label: row.label,
    key,
    keyPrefix,
    scopes,
    expiresAt: row.expiresAt,
    rateLimitPerMinute: row.rateLimitPerMinute,
    createdAt: row.createdAt
  };
}

export async function listIntegratorApiKeys() {
  const prisma = getPrisma();
  return prisma.kyaApiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      scopes: true,
      expiresAt: true,
      rateLimitPerMinute: true,
      createdAt: true,
      revokedAt: true,
      lastUsedAt: true,
      lastUsedIp: true,
      lastUsedUserAgent: true
    }
  });
}

export async function revokeIntegratorApiKey(id: string) {
  const prisma = getPrisma();
  return prisma.kyaApiKey.update({
    where: { id },
    data: { revokedAt: new Date() }
  });
}

export async function touchApiKeyUsage(id: string, request?: Request) {
  const prisma = getPrisma();
  await prisma.kyaApiKey.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: request ? getClientIp(request) : undefined,
      lastUsedUserAgent: request ? getUserAgent(request).slice(0, 500) : undefined
    }
  });
}
