import { AgentPayGuard } from "./vendor/agentpay/core/guard.js";
import { verifyAuditChain } from "./vendor/agentpay/core/audit.js";
import { Prisma } from "@prisma/client";
import { getPrisma } from "./prisma";
import { createPrismaStore } from "./prisma-store.js";
import type { VendorScreeningProvider } from "./screening/index";

interface WithGuardOptions {
  screeningProvider?: VendorScreeningProvider;
}

export async function withGuard<T>(
  fn: (guard: AgentPayGuard, store: Awaited<ReturnType<typeof createPrismaStore>>, prisma: ReturnType<typeof getPrisma>) => Promise<T>,
  options: WithGuardOptions = {}
): Promise<T> {
  const prisma = getPrisma();
  return prisma.$transaction(
    async (tx) => {
      const store = await createPrismaStore(tx, { mode: "demo" });
      const guardOptions: Record<string, unknown> = { store: store as never };
      if (options.screeningProvider) {
        guardOptions.screeningProvider = options.screeningProvider;
      }
      const guard = new AgentPayGuard(guardOptions);
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
