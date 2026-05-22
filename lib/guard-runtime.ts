import { AgentPayGuard } from "./vendor/agentpay/core/guard.js";
import { verifyAuditChain } from "./vendor/agentpay/core/audit.js";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma";
import { createPrismaStore } from "./prisma-store.js";

export async function withGuard<T>(
  fn: (guard: AgentPayGuard, store: Awaited<ReturnType<typeof createPrismaStore>>, prisma: ReturnType<typeof getPrisma>) => Promise<T>
): Promise<T> {
  const prisma = getPrisma();
  return prisma.$transaction(
    async (tx) => {
      const store = await createPrismaStore(tx, { mode: "demo" });
      const guard = new AgentPayGuard({ store: store as never });
      const result = await fn(guard, store, tx as never);
      await store.persist();
      return result;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function verifyStoredAuditChain() {
  return withGuard(async (guard) => verifyAuditChain(guard.store.auditEvents));
}
