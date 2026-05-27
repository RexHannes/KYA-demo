import { NextResponse } from "next/server";
import { verifyStoredAuditChain } from "@/lib/guard-runtime";
import { getPrisma, hasDatabase } from "@/lib/prisma";

export async function GET() {
  if (!hasDatabase()) {
    return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const prisma = getPrisma();
    const [verification, chainLength] = await Promise.all([
      verifyStoredAuditChain(),
      prisma.kyaAuditEvent.count()
    ]);

    return NextResponse.json({
      chainLength,
      intact: verification.valid,
      failures: verification.valid ? [] : verification.failures,
      latestHash: chainLength > 0
        ? await prisma.kyaAuditEvent
            .findFirst({ orderBy: { createdAt: "desc" }, select: { eventHash: true } })
            .then((e) => e?.eventHash ?? null)
        : null
    });
  } catch (error) {
    return NextResponse.json(
      { error: "verification_failed", message: error instanceof Error ? error.message : "unknown" },
      { status: 500 }
    );
  }
}
