import { extractDemoMeta } from "./demo-world";
import { appendLiveEvent } from "./live-feed";
import { withGuard } from "./guard-runtime";
import { touchApiKeyUsage } from "./api-keys";
import { buildScreeningProvider } from "./screening/factory";
import { runMonitoringChecks } from "./monitoring/engine";

const pendingDemoMeta = new Map<string, ReturnType<typeof extractDemoMeta>["demoMeta"]>();

export async function checkPaymentRequest(
  body: Record<string, unknown>,
  actor = "api:integrator"
) {
  const { paymentBody, demoMeta } = extractDemoMeta(body);

  // Phase 2.2: Build Chainalysis screening provider async before entering the sync guard
  const screeningProvider = await buildScreeningProvider(paymentBody as Record<string, unknown>);

  const result = await withGuard(async (guard) => {
    const r = guard.checkPayment(paymentBody, actor);

    if (demoMeta.demo_agent_slug || demoMeta.demo_agent_name) {
      pendingDemoMeta.set(r.payment_request.id, demoMeta);
      await appendLiveEvent({
        agent_slug: String(demoMeta.demo_agent_slug ?? "integrator"),
        agent_name: String(demoMeta.demo_agent_name ?? "External agent"),
        phase: "decision",
        message: `${r.decision.status} (${r.decision.reason})`,
        llm: demoMeta.demo_llm,
        payment_request: r.payment_request,
        decision: r.decision,
        case: r.case,
        obeyed:
          r.decision.status === "blocked" ||
          r.decision.status === "pending_human_approval" ||
          r.decision.status === "manual_review"
      });
    }

    return r;
  }, { screeningProvider });

  // Phase 2.4: Fire monitoring checks non-blocking (after guard so live feed event exists)
  const agentSlug = String(demoMeta.demo_agent_slug ?? "integrator");
  runMonitoringChecks(
    agentSlug,
    result.payment_request.id,
    parseFloat(String(body.amount_usd ?? "0")),
    String(body.merchant ?? "")
  ).catch((err) => console.error("Monitoring check failed:", err));

  return result;
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
