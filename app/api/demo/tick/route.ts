import { NextResponse } from "next/server";
import { runDemoAgentTick } from "@/lib/agents/run-tick";
import { runMemoryAgentTick } from "@/lib/memory-runtime";
import { hasDatabase } from "@/lib/prisma";
import { assertPublicDemoAccess } from "@/lib/demo-access";
import { readJsonBody } from "@/lib/http";

export async function POST(request: Request) {
  const denied = await assertPublicDemoAccess(request, "tick");
  if (denied) return denied;

  try {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data as Record<string, unknown>;
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
