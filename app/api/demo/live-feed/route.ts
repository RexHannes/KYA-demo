import { NextResponse } from "next/server";
import { listLiveEvents, liveFeedStats } from "@/lib/live-feed";
import { hasDatabase } from "@/lib/prisma";
import { listMemoryEvents, memoryStats } from "@/lib/memory-runtime";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const agentSlug = url.searchParams.get("agent_slug") ?? undefined;
  if (!hasDatabase()) {
    return NextResponse.json({
      events: listMemoryEvents({ limit, agentSlug }),
      stats: memoryStats(),
      fallback: "memory"
    });
  }

  const events = await listLiveEvents({ limit, agentSlug });
  const stats = await liveFeedStats();
  return NextResponse.json({
    events: events.map((event) => ({
      id: event.id,
      at: event.at.toISOString(),
      agent_slug: event.agentSlug,
      agent_name: event.agentName,
      phase: event.phase,
      message: event.message,
      llm: event.llm,
      payment_request: event.payment,
      decision: event.decision,
      receipt: event.receipt,
      case: event.case,
      obeyed: event.obeyed
    })),
    stats
  });
}
