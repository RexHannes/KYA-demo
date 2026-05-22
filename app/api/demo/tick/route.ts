import { NextResponse } from "next/server";
import { runDemoAgentTick } from "@/lib/agents/run-tick";
import { runMemoryAgentTick } from "@/lib/memory-runtime";
import { hasDatabase } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const agentSlug = typeof body.agent_slug === "string" ? body.agent_slug : undefined;
    if (!hasDatabase()) {
      const result = await runMemoryAgentTick(agentSlug);
      return NextResponse.json({ ok: true, fallback: "memory", result });
    }

    const result = await runDemoAgentTick(agentSlug);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "tick_failed" },
      { status: 500 }
    );
  }
}
