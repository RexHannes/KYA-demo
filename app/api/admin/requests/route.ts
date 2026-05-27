import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { fetchAdminLiveFeed } from "@/lib/admin-live-feed";

export async function GET(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
  const skip = (page - 1) * limit;
  const agentFilter = url.searchParams.get("agent") ?? undefined;

  if (!hasDatabase()) {
    const feed = await fetchAdminLiveFeed(request, Math.max(page * limit, 100));
    const events = feed.events.filter((event) => {
      return event.phase === "decision" && (!agentFilter || event.agent_slug === agentFilter);
    });
    const pageEvents = events.slice(skip, skip + limit);
    return NextResponse.json({
      requests: pageEvents.map((event) => {
        const payment = event.payment_request as Record<string, unknown> | undefined;
        return {
          id: event.id,
          at: event.at,
          agent_slug: event.agent_slug,
          agent_name: event.agent_name,
          merchant: payment?.merchant ?? null,
          amount_usd: payment?.amount_usd ?? null,
          token: payment?.token ?? null,
          chain: payment?.chain ?? null,
          purpose: payment?.purpose ?? null,
          status: event.decision?.status ?? null,
          reason: event.decision?.reason ?? null,
          payment_request_id: payment?.id ?? null
        };
      }),
      pagination: {
        page,
        limit,
        total: events.length,
        pages: Math.ceil(events.length / limit)
      },
      fallback: "memory"
    });
  }

  const prisma = getPrisma();
  const [events, total] = await Promise.all([
    prisma.kyaLiveFeedEvent.findMany({
      where: {
        phase: "decision",
        ...(agentFilter ? { agentSlug: agentFilter } : {})
      },
      orderBy: { at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        at: true,
        agentSlug: true,
        agentName: true,
        payment: true,
        decision: true
      }
    }),
    prisma.kyaLiveFeedEvent.count({
      where: {
        phase: "decision",
        ...(agentFilter ? { agentSlug: agentFilter } : {})
      }
    })
  ]);

  return NextResponse.json({
    requests: events.map((e) => {
      const payment = e.payment as Record<string, unknown> | null;
      const decision = e.decision as Record<string, unknown> | null;
      return {
        id: e.id,
        at: e.at.toISOString(),
        agent_slug: e.agentSlug,
        agent_name: e.agentName,
        merchant: payment?.merchant ?? null,
        amount_usd: payment?.amount_usd ?? null,
        token: payment?.token ?? null,
        chain: payment?.chain ?? null,
        purpose: payment?.purpose ?? null,
        status: decision?.status ?? null,
        reason: decision?.reason ?? null,
        payment_request_id: (payment as Record<string, unknown> | null)?.id ?? null
      };
    }),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
