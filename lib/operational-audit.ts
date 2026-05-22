import { createAuditEvent } from "./vendor/agentpay/core/audit.js";
import { appendLiveEvent } from "./live-feed";
import { getPrisma, hasDatabase } from "./prisma";

const globalForOpsAudit = globalThis as unknown as { kyaOpsAuditSeq?: number };

type AuditEventRecord = {
  id: string;
  type: string;
  actor: string;
  subject_id: string;
  case_id: string | null;
  input_hash: string;
  output_hash: string;
  policy_version: string | null;
  previous_event_hash: string | null;
  created_at: string;
  event_hash: string;
};

export async function appendOperationalAuditEvent({
  type,
  actor,
  subjectId,
  input = {},
  output = {}
}: {
  type: string;
  actor: string;
  subjectId: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}) {
  if (!hasDatabase()) return null;

  const prisma = getPrisma();
  const previous = await prisma.kyaAuditEvent.findFirst({
    orderBy: { createdAt: "desc" }
  });
  const seq = (globalForOpsAudit.kyaOpsAuditSeq ?? 0) + 1;
  globalForOpsAudit.kyaOpsAuditSeq = seq;
  const event = (createAuditEvent as unknown as (input: Record<string, unknown>) => AuditEventRecord)({
    id: `evt_admin_${Date.now()}_${seq}`,
    type,
    actor,
    subject_id: subjectId,
    input,
    output,
    previous_event_hash: previous?.eventHash ?? null,
    created_at: new Date().toISOString()
  });

  await prisma.kyaAuditEvent.create({
    data: {
      id: event.id,
      type: event.type,
      actor: event.actor,
      subjectId: event.subject_id,
      caseId: event.case_id,
      inputHash: event.input_hash,
      outputHash: event.output_hash,
      policyVersion: event.policy_version,
      previousEventHash: event.previous_event_hash,
      createdAt: new Date(event.created_at),
      eventHash: event.event_hash,
      payload: event
    }
  });

  await appendLiveEvent({
    agent_slug: "admin",
    agent_name: "Operator backstage",
    phase: "admin",
    message: `${type.replaceAll("_", " ").toLowerCase()} for ${subjectId}`,
    decision: output
  });

  return event;
}
