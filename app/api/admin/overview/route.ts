import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { verifyStoredAuditChain } from "@/lib/guard-runtime";
import { listIntegratorApiKeys } from "@/lib/api-keys";
import { memoryStatus } from "@/lib/memory-runtime";

export async function GET(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  if (!hasDatabase()) {
    const status = memoryStatus();
    return NextResponse.json({
      database: status.database,
      audit_chain_valid: status.audit_chain_valid,
      counts: {
        audit_events: status.counts.audit_events,
        decisions: status.counts.decisions,
        payment_requests: 0,
        agents: 0,
        live_feed: status.counts.live_feed
      },
      api_keys: [],
      last_cron_at: status.last_cron_at,
      require_demo_api_key: process.env.REQUIRE_DEMO_API_KEY === "true"
    });
  }

  const prisma = getPrisma();
  const verification = await verifyStoredAuditChain();
  const keys = await listIntegratorApiKeys();
  const snapshot = await prisma.kyaStatusSnapshot.findUnique({ where: { id: "global" } });

  return NextResponse.json({
    database: "connected",
    audit_chain_valid: verification.valid,
    counts: {
      audit_events: await prisma.kyaAuditEvent.count(),
      decisions: await prisma.kyaEntity.count({ where: { collection: "policy_decisions" } }),
      payment_requests: await prisma.kyaEntity.count({ where: { collection: "payment_requests" } }),
      agents: await prisma.kyaEntity.count({ where: { collection: "agents" } }),
      live_feed: await prisma.kyaLiveFeedEvent.count()
    },
    api_keys: keys,
    last_cron_at: snapshot?.lastCronAt?.toISOString() ?? null,
    require_demo_api_key: process.env.REQUIRE_DEMO_API_KEY === "true"
  });
}
