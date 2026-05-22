import { AgentPayGuard } from "./vendor/agentpay/core/guard.js";
import { verifyAuditChain } from "./vendor/agentpay/core/audit.js";
import { getPrisma } from "./prisma";
import { createPrismaStore } from "./prisma-store.js";

export async function withGuard<T>(
  fn: (guard: AgentPayGuard, store: Awaited<ReturnType<typeof createPrismaStore>>, prisma: ReturnType<typeof getPrisma>) => Promise<T>
): Promise<T> {
  const prisma = getPrisma();
  const store = await createPrismaStore(prisma);
  const guard = new AgentPayGuard({ store: store as never });
  const result = await fn(guard, store, prisma);
  await store.persist();
  return result;
}

export async function verifyStoredAuditChain() {
  return withGuard(async (guard) => verifyAuditChain(guard.store.auditEvents));
}
