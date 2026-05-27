import { AgentPayGuard } from "./vendor/agentpay/core/guard.js";
import { verifyAuditChain } from "./vendor/agentpay/core/audit.js";
import { AGENT_DEFINITIONS, type DemoWorld } from "./demo-world";
import { planPurchase } from "./agents/llm.js";
import { randomId } from "./agents/catalogs.js";

type MemoryEvent = {
  id: string;
  at: string;
  agent_slug: string;
  agent_name: string;
  phase: string;
  message?: string;
  llm?: unknown;
  payment_request?: unknown;
  decision?: { status?: string; reason?: string };
  receipt?: unknown;
  case?: unknown;
  obeyed?: boolean;
};

type MemoryState = {
  guard: AgentPayGuard;
  world: DemoWorld | null;
  events: MemoryEvent[];
  eventSeq: number;
  rotation: number;
  startedAt: string;
  lastCronAt: string | null;
  lastCronAgent: string | null;
};

const globalForMemory = globalThis as unknown as { kyaMemory?: MemoryState };

function state() {
  if (!globalForMemory.kyaMemory) {
    globalForMemory.kyaMemory = {
      guard: new AgentPayGuard(),
      world: null,
      events: [],
      eventSeq: 0,
      rotation: 0,
      startedAt: new Date().toISOString(),
      lastCronAt: null,
      lastCronAgent: null
    };
  }
  return globalForMemory.kyaMemory;
}

function append(event: Omit<MemoryEvent, "id" | "at">) {
  const runtime = state();
  const entry = {
    id: `mem_evt_${++runtime.eventSeq}`,
    at: new Date().toISOString(),
    ...event
  };
  runtime.events.unshift(entry);
  runtime.events.length = Math.min(runtime.events.length, 200);
  return entry;
}

export function seedMemoryWorld() {
  const runtime = state();
  if (runtime.world?.agents.length) {
    return runtime.world;
  }

  const principal = runtime.guard.createPrincipal(
    {
      type: "company",
      legal_name: "Acme Demo Holdings",
      jurisdiction: "HK",
      company_number: "DEMO-ACME-001"
    },
    "demo:seed"
  );
  const user = runtime.guard.createUser(
    {
      principal_id: principal.id,
      email: "cfo@acme.demo",
      role: "finance_approver"
    },
    "demo:seed"
  );

  const agents = AGENT_DEFINITIONS.map((definition) => {
    const agent = runtime.guard.createAgent(
      { ...definition.agent, principal_id: principal.id },
      "demo:seed"
    );
    const mandate = runtime.guard.createMandate(
      {
        ...definition.mandate,
        agent_id: agent.id,
        principal_id: principal.id,
        signed_by: user.email
      },
      "demo:seed"
    );
    return {
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      agent_id: agent.id,
      mandate_id: mandate.id,
      principal_id: principal.id
    };
  });

  runtime.world = {
    principal_id: principal.id,
    user_id: user.id,
    user_email: user.email,
    agents
  };

  append({
    agent_slug: "system",
    agent_name: "AgentPay Guard",
    phase: "seed",
    message: `Seeded ${agents.length} demo agents for ${principal.legal_name}.`
  });

  return runtime.world;
}

export function getMemoryWorld() {
  return state().world;
}

export async function runMemoryAgentTick(agentSlug?: string) {
  const runtime = state();
  const world = seedMemoryWorld();
  const slug =
    agentSlug ??
    ["procurement", "research", "travel"][runtime.rotation++ % 3];
  const agentRecord = world.agents.find((agent) => agent.slug === slug);
  if (!agentRecord) {
    throw new Error(`Unknown demo agent: ${slug}`);
  }

  const plan = await planPurchase(slug, agentRecord, process.env);
  const paymentBody = {
    merchant: plan.merchant,
    amount_usd: String(plan.amount_usd),
    token: "USDC",
    chain: "base",
    purpose: plan.purpose,
    counterparty_wallet_address: plan.counterparty_wallet_address ?? undefined,
    merchant_request_id: randomId(`${slug}_mreq`),
    nonce: randomId(`${slug}_nonce`),
    idempotency_key: randomId(`${slug}_idem`),
    decision_ttl: "PT10M",
    agent_id: agentRecord.agent_id,
    mandate_id: agentRecord.mandate_id
  };

  const result = runtime.guard.checkPayment(paymentBody, `agent:${slug}`);
  append({
    agent_slug: slug,
    agent_name: agentRecord.name,
    phase: "decision",
    message: `${result.decision.status} (${result.decision.reason})`,
    llm: {
      provider: plan.provider,
      model: plan.model,
      item_description: plan.item_description,
      reasoning: plan.reasoning
    },
    payment_request: result.payment_request,
    decision: result.decision,
    case: result.case,
    obeyed: result.decision.status !== "approved"
  });

  let execution = null;
  if (result.decision.status === "approved") {
    execution = runtime.guard.executeMockPayment(result.payment_request.id, `agent:${slug}`);
    append({
      agent_slug: slug,
      agent_name: agentRecord.name,
      phase: "executed",
      message: `Mock payment executed; receipt ${execution.receipt?.id ?? "created"}.`,
      payment_request: result.payment_request,
      decision: result.decision,
      receipt: execution.receipt,
      obeyed: true
    });
  }

  runtime.lastCronAt = new Date().toISOString();
  runtime.lastCronAgent = slug;
  return { plan, result, execution };
}

export async function ensureMemoryShowcaseData() {
  const decisions = listMemoryEvents({ limit: 50 }).filter((event) => event.phase === "decision");
  const statuses = new Set(decisions.map((event) => event.decision?.status));
  const needsMore =
    decisions.length < 3 ||
    !statuses.has("approved") ||
    !statuses.has("blocked") ||
    ![...statuses].some((status) => status === "pending_human_approval" || status === "manual_review");

  if (!needsMore) return;

  for (const slug of ["procurement", "research", "travel", "research", "travel"]) {
    await runMemoryAgentTick(slug);
    const current = listMemoryEvents({ limit: 50 }).filter((event) => event.phase === "decision");
    const currentStatuses = new Set(current.map((event) => event.decision?.status));
    if (
      current.length >= 3 &&
      currentStatuses.has("approved") &&
      currentStatuses.has("blocked") &&
      [...currentStatuses].some((status) => status === "pending_human_approval" || status === "manual_review")
    ) {
      break;
    }
  }
}

export function listMemoryEvents({ limit = 50, agentSlug }: { limit?: number; agentSlug?: string }) {
  const events = state().events;
  const filtered = agentSlug ? events.filter((event) => event.agent_slug === agentSlug) : events;
  return filtered.slice(0, limit);
}

export function memoryStats() {
  const by_agent: Record<string, { decisions: number; approved: number; blocked: number; pending: number }> = {};
  for (const event of state().events) {
    if (event.phase !== "decision") continue;
    const slug = event.agent_slug;
    by_agent[slug] ??= { decisions: 0, approved: 0, blocked: 0, pending: 0 };
    by_agent[slug].decisions += 1;
    if (event.decision?.status === "approved") by_agent[slug].approved += 1;
    else if (event.decision?.status === "blocked") by_agent[slug].blocked += 1;
    else by_agent[slug].pending += 1;
  }
  return { total_events: state().events.length, by_agent };
}

export function memoryStatus() {
  const runtime = state();
  const verification = verifyAuditChain(runtime.guard.store.auditEvents);
  return {
    database: "memory_fallback",
    message: "Supabase DATABASE_URL is not configured; using warm serverless memory for the public demo.",
    demo_mode: true,
    audit_chain_valid: verification.valid,
    audit_event_count: runtime.guard.store.auditEvents.length,
    last_cron_at: runtime.lastCronAt,
    last_cron_agent: runtime.lastCronAgent,
    started_at: runtime.startedAt,
    counts: {
      audit_events: runtime.guard.store.auditEvents.length,
      decisions: [...runtime.guard.store.policyDecisions.values()].length,
      live_feed: runtime.events.length
    }
  };
}

export function exportMemoryEvidencePack(paymentRequestId: string) {
  return state().guard.exportEvidencePack(paymentRequestId);
}
