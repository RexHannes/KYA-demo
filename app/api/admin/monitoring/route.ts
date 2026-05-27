import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma, hasDatabase } from "@/lib/prisma";

export async function GET(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const unreviewed = url.searchParams.get("unreviewed") !== "false";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  if (!hasDatabase()) {
    return NextResponse.json({ alerts: [], fallback: "memory" });
  }

  const prisma = getPrisma();
  const alerts = await prisma.kyaMonitoringAlert.findMany({
    where: unreviewed ? { reviewedAt: null } : undefined,
    orderBy: [
      { severity: "desc" },
      { createdAt: "desc" }
    ],
    take: limit
  });

  return NextResponse.json({ alerts });
}
