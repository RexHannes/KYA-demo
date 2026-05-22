import { extractDemoMeta } from "./demo-world";
import { appendLiveEvent } from "./live-feed";
import { withGuard } from "./guard-runtime";
import { touchApiKeyUsage } from "./api-keys";

const pendingDemoMeta = new Map<string, ReturnType<typeof extractDemoMeta>["demoMeta"]>();

export async function checkPaymentRequest(
  body: Record<string, unknown>,
  actor = "api:integrator"
) {
  const { paymentBody, demoMeta } = extractDemoMeta(body);

  return withGuard(async (guard) => {
    const result = guard.checkPayment(paymentBody, actor);

    if (demoMeta.demo_agent_slug || demoMeta.demo_agent_name) {
      pendingDemoMeta.set(result.payment_request.id, demoMeta);
      await appendLiveEvent({
        agent_slug: String(demoMeta.demo_agent_slug ?? "integrator"),
        agent_name: String(demoMeta.demo_agent_name ?? "External agent"),
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
    }

    return result;
  });
}

export async function executeMockPaymentRequest(paymentRequestId: string, actor = "api:integrator") {
  return withGuard(async (guard) => {
    const result = guard.executeMockPayment(paymentRequestId, actor);
    const demoMeta = pendingDemoMeta.get(paymentRequestId);
    if (demoMeta) {
      const evidencePack = guard.exportEvidencePack(paymentRequestId);
      await appendLiveEvent({
        agent_slug: String(demoMeta.demo_agent_slug ?? "integrator"),
        agent_name: String(demoMeta.demo_agent_name ?? "External agent"),
        phase: "executed",
        message: `Mock payment executed; receipt ${result.receipt?.id ?? "created"}.`,
        payment_request: evidencePack.payment_request,
        decision: evidencePack.decision,
        receipt: result.receipt,
        obeyed: true
      });
      pendingDemoMeta.delete(paymentRequestId);
    }
    return result;
  });
}

export async function exportEvidencePack(paymentRequestId: string) {
  return withGuard(async (guard) => guard.exportEvidencePack(paymentRequestId));
}

export async function recordApiKeyUsage(keyId?: string, request?: Request) {
  if (keyId) await touchApiKeyUsage(keyId, request);
}
