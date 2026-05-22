import { randomId } from "./catalogs.js";
import { planPurchase } from "./llm.js";
import { extractDemoMeta, getDemoWorld, seedDemoWorld } from "../demo-world";
import { appendLiveEvent } from "../live-feed";
import { withGuard } from "../guard-runtime";
import { getPrisma } from "../prisma";

const ROTATION = ["procurement", "research", "travel"];

export async function nextAgentSlug(prisma = getPrisma()) {
  const counter = await prisma.kyaCounter.upsert({
    where: { prefix: "agent_rotation" },
    create: { prefix: "agent_rotation", value: 1 },
    update: { value: { increment: 1 } }
  });
  return ROTATION[(counter.value - 1) % ROTATION.length];
}

export async function runDemoAgentTick(agentSlug?: string) {
  const prisma = getPrisma();
  const resolvedAgentSlug = agentSlug ?? (await nextAgentSlug(prisma));
  let world = await getDemoWorld(prisma);

  return withGuard(async (guard) => {
    if (!world) {
      world = await seedDemoWorld(guard, prisma);
    }

    const agentRecord = world.agents.find((agent) => agent.slug === resolvedAgentSlug);
    if (!agentRecord) {
      throw new Error(`Unknown demo agent: ${resolvedAgentSlug}`);
    }

    const plan = await planPurchase(resolvedAgentSlug, agentRecord, process.env);
    const paymentBody = {
      merchant: plan.merchant,
      amount_usd: String(plan.amount_usd),
      token: "USDC",
      chain: "base",
      purpose: plan.purpose,
      counterparty_wallet_address: plan.counterparty_wallet_address ?? undefined,
      merchant_request_id: randomId(`${resolvedAgentSlug}_mreq`),
      nonce: randomId(`${resolvedAgentSlug}_nonce`),
      idempotency_key: randomId(`${resolvedAgentSlug}_idem`),
      decision_ttl: "PT10M",
      agent_id: agentRecord.agent_id,
      mandate_id: agentRecord.mandate_id
    };

    const { demoMeta } = extractDemoMeta({
      ...paymentBody,
      demo_agent_slug: resolvedAgentSlug,
      demo_agent_name: agentRecord.name,
      demo_llm: {
        provider: plan.provider,
        model: plan.model,
        item_description: plan.item_description,
        reasoning: plan.reasoning
      }
    });

    const result = guard.checkPayment(paymentBody, `agent:${resolvedAgentSlug}`);

    await appendLiveEvent({
      agent_slug: demoMeta.demo_agent_slug,
      agent_name: demoMeta.demo_agent_name,
      phase: "decision",
      message: `${result.decision.status} (${result.decision.reason})`,
      llm: demoMeta.demo_llm,
      payment_request: result.payment_request,
      decision: result.decision,
      case: result.case,
      obeyed:
        result.decision.status === "blocked" ||
        result.decision.status === "pending_human_approval" ||
        result.decision.status === "manual_review"
    });

    let execution = null;
    if (result.decision.status === "approved") {
      execution = guard.executeMockPayment(result.payment_request.id, `agent:${resolvedAgentSlug}`);
      await appendLiveEvent({
        agent_slug: resolvedAgentSlug,
        agent_name: agentRecord.name,
        phase: "executed",
        message: `Mock payment executed; receipt ${execution.receipt?.id ?? "created"}.`,
        payment_request: result.payment_request,
        decision: result.decision,
        receipt: execution.receipt,
        obeyed: true
      });
    }

    await prisma.kyaStatusSnapshot.upsert({
      where: { id: "global" },
      create: {
        id: "global",
        lastCronAt: new Date(),
        lastCronAgent: resolvedAgentSlug,
        totalDecisions: 1
      },
      update: {
        lastCronAt: new Date(),
        lastCronAgent: resolvedAgentSlug,
        totalDecisions: { increment: 1 }
      }
    });

    return { plan, result, execution };
  });
}
