import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { fetchAdminLiveFeed } from "@/lib/admin-live-feed";

export async function GET(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const unreviewed = url.searchParams.get("unreviewed") !== "false";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);

  if (!hasDatabase()) {
    const feed = await fetchAdminLiveFeed(request, 200);
    const alerts = feed.events
      .filter((event) => event.phase === "decision")
      .filter((event) => {
        const status = event.decision?.status;
        return status === "blocked" || status === "manual_review" || status === "pending_human_approval";
      })
      .slice(0, limit)
      .map((event) => {
        const status = event.decision?.status;
        const paymentRequestId = event.payment_request?.id;
        return {
          id: `mem_alert_${event.id}`,
          agentSlug: event.agent_slug,
          alertType: status === "blocked" ? "BLOCKED_DECISION" : "REVIEW_REQUIRED",
          severity: status === "blocked" ? "CRITICAL" : "WARNING",
          description: `${event.agent_name} returned ${status} for ${event.payment_request?.merchant ?? "unknown merchant"}.`,
          triggeringIds: paymentRequestId ? [paymentRequestId] : [],
          reviewedAt: null,
          reviewedBy: null,
          createdAt: event.at,
          mode: "demo"
        };
      });
    return NextResponse.json({ alerts, fallback: "memory" });
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
