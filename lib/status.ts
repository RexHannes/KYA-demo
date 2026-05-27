import { getPrisma, hasDatabase } from "@/lib/prisma";
import { verifyStoredAuditChain } from "@/lib/guard-runtime";
import { ensureMemoryShowcaseData, memoryStatus } from "@/lib/memory-runtime";

export type SystemStatus = {
  database: string;
  message?: string;
  demo_mode: boolean;
  audit_chain_valid: boolean;
  audit_event_count: number;
  last_cron_at: string | null;
  last_cron_agent: string | null;
  started_at?: string;
  counts: {
    audit_events: number;
    decisions: number;
    live_feed: number;
  };
};

export async function getSystemStatus(): Promise<SystemStatus> {
  if (!hasDatabase()) {
    await ensureMemoryShowcaseData();
    return memoryStatus();
  }

  const prisma = getPrisma();
  await prisma.$queryRaw`SELECT 1`;
  const [verification, snapshot, auditEvents, decisions, liveFeed] = await Promise.all([
    verifyStoredAuditChain(),
    prisma.kyaStatusSnapshot.findUnique({ where: { id: "global" } }),
    prisma.kyaAuditEvent.count(),
    prisma.kyaEntity.count({ where: { collection: "policy_decisions" } }),
    prisma.kyaLiveFeedEvent.count()
  ]);

  return {
    database: "connected",
    demo_mode: true,
    audit_chain_valid: verification.valid,
    audit_event_count: auditEvents,
    last_cron_at: snapshot?.lastCronAt?.toISOString() ?? null,
    last_cron_agent: snapshot?.lastCronAgent ?? null,
    counts: {
      audit_events: auditEvents,
      decisions,
      live_feed: liveFeed
    }
  };
}
