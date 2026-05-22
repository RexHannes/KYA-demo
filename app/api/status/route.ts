import { NextResponse } from "next/server";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { verifyStoredAuditChain } from "@/lib/guard-runtime";
import { memoryStatus } from "@/lib/memory-runtime";

export async function GET() {
  try {
    if (!hasDatabase()) {
      return NextResponse.json(memoryStatus());
    }

    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    const verification = await verifyStoredAuditChain();
    const snapshot = await prisma.kyaStatusSnapshot.findUnique({ where: { id: "global" } });
    const counts = {
      audit_events: await prisma.kyaAuditEvent.count(),
      decisions: await prisma.kyaEntity.count({ where: { collection: "policy_decisions" } }),
      live_feed: await prisma.kyaLiveFeedEvent.count()
    };
    return NextResponse.json({
      database: "connected",
      demo_mode: process.env.DEMO_MODE === "true" || true,
      audit_chain_valid: verification.valid,
      audit_event_count: counts.audit_events,
      last_cron_at: snapshot?.lastCronAt?.toISOString() ?? null,
      last_cron_agent: snapshot?.lastCronAgent ?? null,
      counts
    });
  } catch (error) {
    return NextResponse.json(
      {
        database: "error",
        message: error instanceof Error ? error.message : "status_failed"
      },
      { status: 500 }
    );
  }
}
