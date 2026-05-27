import { hasDatabase, getPrisma } from "@/lib/prisma";
import { ensureMemoryShowcaseData, listMemoryEvents, memoryStatus } from "@/lib/memory-runtime";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export type DecisionRow = ReturnType<typeof summarizeDecision>;

export type AuditRow = {
  id: string;
  type: string;
  actor: string;
  subject_id: string | null;
  case_id: string | null;
  policy_version: string | null;
  previous_event_hash: string | null;
  event_hash: string;
  created_at: string;
};

export type EvidenceReport = {
  generated_at: string;
  data_source: string;
  finding: string;
  status: {
    database: string;
    audit_chain_valid?: boolean;
    counts?: Record<string, number>;
    last_cron_at?: string | null;
    last_cron_agent?: string | null;
  };
  stats: { approved?: number; blocked?: number; review?: number };
  decisions: DecisionRow[];
  audit_trail: AuditRow[];
};

function summarizeDecision(event: {
  id: string;
  at: Date | string;
  agentSlug?: string;
  agentName?: string;
  agent_slug?: string;
  agent_name?: string;
  llm?: unknown;
  payment?: unknown;
  payment_request?: unknown;
  decision?: unknown;
  receipt?: unknown;
  case?: unknown;
}) {
  const payment = asObject(event.payment ?? event.payment_request);
  const decision = asObject(event.decision);
  const receipt = asObject(event.receipt);
  const reviewCase = asObject(event.case);
  const rulesTriggered = Array.isArray(decision.rules_triggered) ? decision.rules_triggered : [];
  const rulesChecked = Array.isArray(decision.rules_checked) ? decision.rules_checked : [];
  const screening = asObject(decision.screening_result);
  const screeningChecks = Array.isArray(screening.checks) ? screening.checks : [];

  return {
    id: event.id,
    observed_at: event.at instanceof Date ? event.at.toISOString() : event.at,
    agent_slug: event.agentSlug ?? event.agent_slug ?? "system",
    agent_name: event.agentName ?? event.agent_name ?? "System",
    request: {
      id: asString(payment.id),
      merchant: asString(payment.merchant),
      amount_usd: asString(payment.amount_usd),
      token: asString(payment.token),
      chain: asString(payment.chain),
      purpose: asString(payment.purpose)
    },
    decision: {
      id: asString(decision.id),
      status: asString(decision.status) ?? "unknown",
      reason: asString(decision.reason) ?? "unknown",
      approval_required: Boolean(decision.approval_required),
      policy_version: asString(decision.policy_version),
      rules_checked_count: rulesChecked.length,
      rules_triggered: rulesTriggered.map((rule) => {
        const item = asObject(rule);
        return {
          id: asString(item.id),
          action: asString(item.action),
          reason: asString(item.reason)
        };
      }),
      screening_status: asString(decision.screening_status),
      screening_provider: asString(decision.screening_provider),
      screening_checks: screeningChecks.map((check) => {
        const item = asObject(check);
        return {
          type: asString(item.type),
          target: asString(item.target),
          status: asString(item.status),
          source: asString(item.source)
        };
      })
    },
    proof: {
      mandate_hash: asString(decision.mandate_hash),
      payment_request_hash: asString(decision.payment_request_hash),
      receipt_id: asString(receipt.id),
      tx_hash: asString(receipt.tx_hash),
      case_id: asString(reviewCase.id)
    }
  };
}

function findingFor(status: string, reason: string, agentName: string) {
  if (status === "approved") {
    return `${agentName} request was automatically approved because policy checks stayed within mandate.`;
  }
  if (status === "blocked") {
    return `${agentName} request was blocked because ${reason.replaceAll("_", " ")}.`;
  }
  if (status === "pending_human_approval" || status === "manual_review") {
    return `${agentName} request was routed to human review because ${reason.replaceAll("_", " ")}.`;
  }
  return `${agentName} request produced a ${status} decision.`;
}

function sanitizeAudit(event: {
  id: string;
  type: string;
  actor: string;
  subjectId: string | null;
  caseId: string | null;
  policyVersion: string | null;
  previousEventHash: string | null;
  eventHash: string;
  createdAt: Date;
}) {
  return {
    id: event.id,
    type: event.type,
    actor: event.actor,
    subject_id: event.subjectId,
    case_id: event.caseId,
    policy_version: event.policyVersion,
    previous_event_hash: event.previousEventHash,
    event_hash: event.eventHash,
    created_at: event.createdAt.toISOString()
  };
}

function countStatuses(decisions: DecisionRow[]) {
  return decisions.reduce(
    (acc, item) => {
      if (item.decision.status === "approved") acc.approved += 1;
      else if (item.decision.status === "blocked") acc.blocked += 1;
      else acc.review += 1;
      return acc;
    },
    { approved: 0, blocked: 0, review: 0 }
  );
}

export async function buildEvidenceReport(): Promise<EvidenceReport> {
  if (!hasDatabase()) {
    await ensureMemoryShowcaseData();
    const events = listMemoryEvents({ limit: 12 }).filter((event) => event.phase === "decision");
    const decisions = events.map(summarizeDecision);
    const latest = decisions[0];
    return {
      generated_at: new Date().toISOString(),
      data_source: "memory_fallback",
      finding: latest
        ? findingFor(latest.decision.status, latest.decision.reason, latest.agent_name)
        : "No agent decisions have been observed yet.",
      status: memoryStatus(),
      stats: countStatuses(decisions),
      decisions,
      audit_trail: []
    };
  }

  const prisma = getPrisma();
  const [events, auditEvents, snapshot, counts] = await Promise.all([
    prisma.kyaLiveFeedEvent.findMany({
      where: { phase: "decision" },
      orderBy: { at: "desc" },
      take: 12
    }),
    prisma.kyaAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.kyaStatusSnapshot.findUnique({ where: { id: "global" } }),
    Promise.all([
      prisma.kyaAuditEvent.count(),
      prisma.kyaEntity.count({ where: { collection: "policy_decisions" } }),
      prisma.kyaEntity.count({ where: { collection: "payment_requests" } }),
      prisma.kyaLiveFeedEvent.count()
    ])
  ]);

  const decisions = events.map(summarizeDecision);
  const latest = decisions[0];

  return {
    generated_at: new Date().toISOString(),
    data_source: "postgres",
    finding: latest
      ? findingFor(latest.decision.status, latest.decision.reason, latest.agent_name)
      : "No agent decisions have been observed yet.",
    status: {
      database: "connected",
      audit_chain_valid: snapshot?.auditChainValid ?? true,
      last_cron_at: snapshot?.lastCronAt?.toISOString() ?? null,
      last_cron_agent: snapshot?.lastCronAgent ?? null,
      counts: {
        audit_events: counts[0],
        decisions: counts[1],
        payment_requests: counts[2],
        live_feed: counts[3]
      }
    },
    stats: countStatuses(decisions),
    decisions,
    audit_trail: auditEvents.map(sanitizeAudit)
  };
}
