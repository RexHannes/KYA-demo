import { randomBytes } from "node:crypto";
import { hashApiKey } from "./auth";
import { getPrisma } from "./prisma";

export function generateApiKey() {
  const raw = `kya_demo_${randomBytes(24).toString("base64url")}`;
  return raw;
}

export async function createIntegratorApiKey(label: string) {
  const prisma = getPrisma();
  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = key.slice(0, 16);

  const row = await prisma.kyaApiKey.create({
    data: { label, keyHash, keyPrefix }
  });

  return { id: row.id, label: row.label, key, keyPrefix, createdAt: row.createdAt };
}

export async function listIntegratorApiKeys() {
  const prisma = getPrisma();
  return prisma.kyaApiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      keyPrefix: true,
      createdAt: true,
      revokedAt: true,
      lastUsedAt: true
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

export async function touchApiKeyUsage(id: string) {
  const prisma = getPrisma();
  await prisma.kyaApiKey.update({
    where: { id },
    data: { lastUsedAt: new Date() }
  });
}
