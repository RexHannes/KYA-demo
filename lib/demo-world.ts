import { appendLiveEvent } from "./live-feed";
import type { AgentPayGuard } from "./vendor/agentpay/core/guard.js";
import type { PrismaClient } from "@prisma/client";

export const AGENT_DEFINITIONS = [
  {
    slug: "procurement",
    name: "ProcurementBot",
    description: "Buys office supplies from approved vendors under $20 auto-approve.",
    agent: {
      name: "ProcurementBot",
      type: "autonomous_procurement",
      wallet_address: "0xabc0000000000000000000000000000000000001",
      chain: "base"
    },
    mandate: {
      allowed_actions: ["buy_office_supplies"],
      allowed_merchants: ["staples.demo", "supplies.vendor.com", "paperworld.demo"],
      denied_merchants: ["blocked.vendor.com"],
      allowed_tokens: ["USDC"],
      allowed_chains: ["base"],
      denied_wallets: [] as string[],
      limits: {
        auto_approve_limit_usd: 20,
        human_approval_limit_usd: 100,
        hard_block_limit_usd: 500,
        daily_limit_usd: 1000
      },
      expires_at: "2027-12-31T23:59:59.000Z"
    }
  },
  {
    slug: "research",
    name: "ResearchBot",
    description: "Purchases API credits and datasets; may probe risky vendors or wallets.",
    agent: {
      name: "ResearchBot",
      type: "autonomous_api_buyer",
      wallet_address: "0xabc0000000000000000000000000000000000002",
      chain: "base"
    },
    mandate: {
      allowed_actions: ["buy_api_credits", "purchase_dataset"],
      allowed_merchants: [
        "api.vendor.com",
        "data.market.demo",
        "sanctioned-example.test",
        "modelhub.demo"
      ],
      denied_merchants: ["blocked.vendor.com"],
      allowed_tokens: ["USDC"],
      allowed_chains: ["base"],
      denied_wallets: ["0xdead000000000000000000000000000000000000"],
      limits: {
        auto_approve_limit_usd: 20,
        human_approval_limit_usd: 100,
        hard_block_limit_usd: 500,
        daily_limit_usd: 1000
      },
      expires_at: "2027-12-31T23:59:59.000Z"
    }
  },
  {
    slug: "travel",
    name: "TravelBot",
    description: "Books hotels and flights; amounts often exceed auto-approve limits.",
    agent: {
      name: "TravelBot",
      type: "autonomous_travel_booker",
      wallet_address: "0xabc0000000000000000000000000000000000003",
      chain: "base"
    },
    mandate: {
      allowed_actions: ["book_travel"],
      allowed_merchants: ["hotels.demo", "flights.demo", "rail.demo"],
      denied_merchants: ["blocked.vendor.com"],
      allowed_tokens: ["USDC"],
      allowed_chains: ["base"],
      denied_wallets: [] as string[],
      limits: {
        auto_approve_limit_usd: 20,
        human_approval_limit_usd: 150,
        hard_block_limit_usd: 800,
        daily_limit_usd: 2000
      },
      expires_at: "2027-12-31T23:59:59.000Z"
    }
  }
];

export type DemoWorld = {
  principal_id: string;
  user_id: string;
  user_email: string;
  agents: Array<{
    slug: string;
    name: string;
    description: string;
    agent_id: string;
    mandate_id: string;
    principal_id: string;
  }>;
};

export async function getDemoWorld(prisma: PrismaClient): Promise<DemoWorld | null> {
  const row = await prisma.kyaKv.findUnique({
    where: { namespace_key: { namespace: "demo", key: "world" } }
  });
  return (row?.value as DemoWorld) ?? null;
}

export async function seedDemoWorld(guard: AgentPayGuard, prisma: PrismaClient) {
  const principal = guard.createPrincipal(
    {
      type: "company",
      legal_name: "Acme Demo Holdings",
      jurisdiction: "HK",
      company_number: "DEMO-ACME-001"
    },
    "demo:seed"
  );
  const user = guard.createUser(
    {
      principal_id: principal.id,
      email: "cfo@acme.demo",
      role: "finance_approver"
    },
    "demo:seed"
  );

  const agents = AGENT_DEFINITIONS.map((definition) => {
    const agent = guard.createAgent(
      { ...definition.agent, principal_id: principal.id },
      "demo:seed"
    );
    const mandate = guard.createMandate(
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

  const world: DemoWorld = {
    principal_id: principal.id,
    user_id: user.id,
    user_email: user.email,
    agents
  };

  await prisma.kyaKv.upsert({
    where: { namespace_key: { namespace: "demo", key: "world" } },
    create: { namespace: "demo", key: "world", value: world },
    update: { value: world }
  });

  await appendLiveEvent({
    agent_slug: "system",
    agent_name: "KYA Demo",
    phase: "seed",
    message: `Seeded ${agents.length} demo agents for ${principal.legal_name}.`
  });

  return world;
}

export function extractDemoMeta(body: Record<string, unknown> = {}) {
  const {
    demo_agent_slug,
    demo_agent_name,
    demo_llm,
    ...paymentBody
  } = body;
  return {
    paymentBody,
    demoMeta: {
      demo_agent_slug: demo_agent_slug ?? null,
      demo_agent_name: demo_agent_name ?? null,
      demo_llm: demo_llm ?? null
    }
  };
}
