import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

const ALLOWED = new Set([
  "principals",
  "users",
  "agents",
  "mandates",
  "payment_requests",
  "policy_decisions",
  "payments",
  "receipts",
  "cases",
  "audit_events",
  "live_feed_events",
  "status_snapshot",
  "api_keys"
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ table: string }> }
) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const { table } = await context.params;
  if (!ALLOWED.has(table)) {
    return NextResponse.json({ error: "invalid_table" }, { status: 400 });
  }

  const prisma = getPrisma();
  if (table === "audit_events") {
    const rows = await prisma.kyaAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return NextResponse.json({ table, rows });
  }
  if (table === "live_feed_events") {
    const rows = await prisma.kyaLiveFeedEvent.findMany({
      orderBy: { at: "desc" },
      take: 100
    });
    return NextResponse.json({ table, rows });
  }
  if (table === "status_snapshot") {
    const rows = await prisma.kyaStatusSnapshot.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100
    });
    return NextResponse.json({ table, rows });
  }
  if (table === "api_keys") {
    const rows = await prisma.kyaApiKey.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
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
        lastUsedUserAgent: true,
        mode: true
      }
    });
    return NextResponse.json({ table, rows });
  }

  const rows = await prisma.kyaEntity.findMany({
    where: { collection: table },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  return NextResponse.json({
    table,
    rows: rows.map((row) => ({ id: row.id, ...((row.data as object) ?? {}) }))
  });
}
