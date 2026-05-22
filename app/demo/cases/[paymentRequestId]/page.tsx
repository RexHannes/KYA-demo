import Link from "next/link";
import { hasDatabase } from "@/lib/prisma";
import { exportEvidencePack } from "@/lib/payments";
import { exportMemoryEvidencePack } from "@/lib/memory-runtime";

type Json = Record<string, unknown>;

const ruleLabels: Record<string, string> = {
  block_inactive_or_revoked_mandate: "Mandate active",
  block_expired_mandate: "Mandate not expired",
  block_disallowed_merchant: "Merchant allowlisted",
  block_disallowed_action: "Purpose allowed",
  block_denylisted_merchant: "Merchant not denylisted",
  block_disallowed_token: "Token allowed",
  block_disallowed_chain: "Chain allowed",
  block_denylisted_wallet: "Wallet not denylisted",
  block_screening_result: "Screening clear",
  block_daily_limit_exceeded: "Daily limit not exceeded",
  block_hard_limit_exceeded: "Hard block limit not exceeded",
  apply_approval_thresholds: "Approval threshold applied"
};

function asObject(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "Not recorded") {
  return typeof value === "string" && value ? value : fallback;
}

function label(value: unknown) {
  return text(value).replaceAll("_", " ");
}

function statusClass(status: unknown) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-800";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function short(value: unknown) {
  const raw = text(value, "");
  return raw.length > 30 ? `${raw.slice(0, 18)}...${raw.slice(-8)}` : raw || "Not issued";
}

async function loadPack(paymentRequestId: string) {
  if (hasDatabase()) return exportEvidencePack(paymentRequestId);
  return exportMemoryEvidencePack(paymentRequestId);
}

export default async function PaymentAuthorityCasePage({
  params
}: {
  params: Promise<{ paymentRequestId: string }>;
}) {
  const { paymentRequestId } = await params;

  let pack: Json;
  try {
    pack = (await loadPack(paymentRequestId)) as Json;
  } catch {
    return (
      <section className="metal-card rounded-3xl p-6">
        <Link href="/demo" className="text-sm text-slate-500 hover:text-slate-900">Back to demo</Link>
        <h1 className="mt-3 text-3xl font-semibold">Case file not found</h1>
        <p className="mt-2 text-slate-600">Run a sandbox agent from the demo page, then open its evidence case.</p>
      </section>
    );
  }

  const principal = asObject(pack.principal);
  const approver = asObject(pack.approver_user);
  const agent = asObject(pack.agent);
  const mandate = asObject(pack.mandate);
  const paymentRequest = asObject(pack.payment_request);
  const decision = asObject(pack.decision);
  const receipt = asObject(pack.receipt);
  const reviewCase = asObject(pack.case);
  const auditVerification = asObject(pack.audit_verification);
  const mandateIntegrity = asObject(pack.mandate_integrity);
  const triggered = new Map(
    asArray(decision.rules_triggered).map((rule) => {
      const item = asObject(rule);
      return [text(item.id, ""), item];
    })
  );
  const rules = asArray(decision.rules_checked).map((ruleId) => {
    const id = text(ruleId, "");
    const hit = triggered.get(id);
    return {
      id,
      label: ruleLabels[id] ?? label(id),
      passed: !hit,
      reason: hit ? label(asObject(hit).reason) : "Passed"
    };
  });
  const auditEvents = asArray(pack.scoped_audit_events);

  return (
    <div className="space-y-6">
      <header className="metal-card rounded-3xl p-6 sm:p-8">
        <Link href="/demo" className="text-sm text-slate-500 hover:text-slate-900">Back to live demo</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Payment Authority Case</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">{label(decision.status)}</h1>
            <p className="mt-2 text-slate-600">
              {text(paymentRequest.amount_usd, "0")} {text(paymentRequest.token, "USDC")} to {text(paymentRequest.merchant)}
              {" "}for {label(paymentRequest.purpose)}.
            </p>
          </div>
          <span className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusClass(decision.status)}`}>
            {label(decision.reason)}
          </span>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <Fact title="Principal" value={text(principal.legal_name)} detail={text(principal.jurisdiction)} />
        <Fact title="Approver" value={text(approver.email)} detail={text(approver.role)} />
        <Fact title="Agent" value={text(agent.name)} detail={text(agent.wallet_address)} mono />
        <Fact title="Audit chain" value={auditVerification.valid === false ? "Needs review" : "Valid"} detail={`${auditEvents.length} scoped events`} />
      </section>

      <section className="metal-card rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Authority chain</p>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-7">
          {([
            ["Company", principal.id],
            ["Approver", approver.id],
            ["Agent", agent.id],
            ["Mandate", mandate.id],
            ["Request", paymentRequest.id],
            ["Decision", decision.id],
            [receipt.id ? "Receipt" : "Case", receipt.id ?? reviewCase.id]
          ] as Array<[string, unknown]>).map(([title, value]) => (
            <div key={String(title)} className="rounded-2xl border border-white/70 bg-white/75 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
              <p className="mt-1 break-words font-mono text-xs">{text(value)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="metal-card rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Rule checklist</p>
          <div className="mt-4 space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/75 p-3 text-sm">
                <span>{rule.label}</span>
                <span className={rule.passed ? "text-emerald-700" : "text-red-700"}>
                  {rule.passed ? "Passed" : rule.reason}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/75 p-3 text-sm">
              <span>Mandate signature valid</span>
              <span className={mandateIntegrity.mandate_signature_valid ? "text-emerald-700" : "text-red-700"}>
                {mandateIntegrity.mandate_signature_valid ? "Passed" : "Needs review"}
              </span>
            </div>
          </div>
        </div>

        <div className="metal-card rounded-3xl p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Receipt / review status</p>
          {receipt.id ? (
            <div className="mt-4 space-y-3 text-sm">
              <Fact title="Receipt" value={text(receipt.id)} detail={text(receipt.tx_hash)} mono />
              <Fact title="Screening" value={label(receipt.screening_status)} detail="Sandbox screening result" />
            </div>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <Fact title="Case" value={text(reviewCase.id)} detail={label(reviewCase.status)} />
              <Fact title="Risk level" value={label(reviewCase.risk_level)} detail={label(reviewCase.decision_reason)} />
            </div>
          )}
        </div>
      </section>

      <section className="metal-card rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Scoped audit timeline</p>
        <div className="mt-4 grid gap-2">
          {auditEvents.map((event) => {
            const item = asObject(event);
            return (
              <div key={text(item.id)} className="rounded-2xl border border-white/70 bg-white/75 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{text(item.type)}</strong>
                  <span className="text-slate-500">{new Date(text(item.created_at, new Date().toISOString())).toLocaleString()}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  prev {short(item.previous_event_hash)} / event {short(item.event_hash)}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="metal-card rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Raw evidence pack</p>
        <pre className="mt-4 max-h-[38rem] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
          {JSON.stringify(pack, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function Fact({ title, value, detail, mono = false }: { title: string; value: string; detail?: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className={`mt-1 break-words font-semibold ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      {detail ? <p className="mt-1 break-words text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}
