import { NextResponse } from "next/server";
import { runDemoAgentTick } from "@/lib/agents/run-tick";
import { verifyStoredAuditChain } from "@/lib/guard-runtime";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { memoryStatus, runMemoryAgentTick } from "@/lib/memory-runtime";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    if (!hasDatabase()) {
      const result = await runMemoryAgentTick();
      return NextResponse.json({ ok: true, fallback: "memory", status: memoryStatus(), agent: result.plan?.merchant });
    }

    const result = await runDemoAgentTick();
    const verification = await verifyStoredAuditChain();
    const prisma = getPrisma();
    const auditCount = await prisma.kyaAuditEvent.count();
    await prisma.kyaStatusSnapshot.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        auditChainValid: verification.valid,
        totalAuditEvents: auditCount,
        lastCronAt: new Date()
      },
      update: {
        auditChainValid: verification.valid,
        totalAuditEvents: auditCount,
        lastCronAt: new Date()
      }
    });
    return NextResponse.json({ ok: true, verification, agent: result.plan?.merchant });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "cron_failed" },
      { status: 500 }
    );
  }
}
