import { getPrisma } from "./prisma";

export async function appendLiveEvent(event: Record<string, unknown>) {
  const prisma = getPrisma();
  return prisma.kyaLiveFeedEvent.create({
    data: {
      agentSlug: String(event.agent_slug ?? "system"),
      agentName: String(event.agent_name ?? event.agent_slug ?? "system"),
      phase: String(event.phase ?? "info"),
      message: event.message ? String(event.message) : null,
      llm: event.llm ?? undefined,
      payment: event.payment_request ?? undefined,
      decision: event.decision ?? undefined,
      receipt: event.receipt ?? undefined,
      case: event.case ?? undefined,
      obeyed: typeof event.obeyed === "boolean" ? event.obeyed : null
    }
  });
}

export async function listLiveEvents({ limit = 50, agentSlug }: { limit?: number; agentSlug?: string }) {
  const prisma = getPrisma();
  return prisma.kyaLiveFeedEvent.findMany({
    where: agentSlug ? { agentSlug } : undefined,
    orderBy: { at: "desc" },
    take: limit
  });
}

export async function clearLiveEvents() {
  const prisma = getPrisma();
  await prisma.kyaLiveFeedEvent.deleteMany({});
}

export async function liveFeedStats() {
  const prisma = getPrisma();
  const events = await prisma.kyaLiveFeedEvent.findMany({
    where: { phase: "decision" },
    select: { agentSlug: true, decision: true }
  });
  const byAgent: Record<string, { decisions: number; approved: number; blocked: number; pending: number }> = {};
  for (const event of events) {
    const slug = event.agentSlug;
    byAgent[slug] ??= { decisions: 0, approved: 0, blocked: 0, pending: 0 };
    byAgent[slug].decisions += 1;
    const status = (event.decision as { status?: string } | null)?.status;
    if (status === "approved") byAgent[slug].approved += 1;
    else if (status === "blocked") byAgent[slug].blocked += 1;
    else byAgent[slug].pending += 1;
  }
  const total = await prisma.kyaLiveFeedEvent.count();
  return { total_events: total, by_agent: byAgent };
}
