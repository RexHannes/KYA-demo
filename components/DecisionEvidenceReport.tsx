import type { EvidenceReport } from "@/lib/demo-report";

function shortHash(value: string | null) {
  if (!value) return "not issued";
  return value.length > 24 ? `${value.slice(0, 18)}...${value.slice(-8)}` : value;
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "not recorded";
}

function statusClass(status: string) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "blocked") return "border-red-200 bg-red-50 text-red-800";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function DecisionEvidenceReport({ report }: { report: EvidenceReport }) {
  const latest = report?.decisions[0] ?? null;
  const rows = report.decisions.slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="metal-card rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Live evidence report</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Agent payment decision proof</h1>
        <p className="mt-3 max-w-3xl text-slate-600">
          This report is generated server-side from the live demo runtime. It shows only the necessary decision factors,
          request identifiers, and audit hashes needed to explain and verify each AgentPay Guard outcome.
        </p>
        <div className="mt-6 rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Key finding</p>
          <p className="mt-2 text-xl font-semibold text-slate-950">{report.finding}</p>
          <p className="mt-2 text-sm text-slate-600">
            Source: {label(report.data_source)}. Generated {new Date(report.generated_at).toLocaleString()}.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Metric label="Audit chain" value={report.status.audit_chain_valid === false ? "Needs review" : "Valid"} />
        <Metric label="Audit events" value={String(report.status.counts?.audit_events ?? 0)} />
        <Metric label="Decisions" value={String(report.status.counts?.decisions ?? 0)} />
        <Metric label="Live feed rows" value={String(report.status.counts?.live_feed ?? 0)} />
      </section>

      {latest ? (
        <section className="metal-card rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Latest observed decision</p>
              <h2 className="mt-1 text-2xl font-semibold">{latest.agent_name}</h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(latest.decision.status)}`}>
              {label(latest.decision.status)}
            </span>
          </div>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <Fact label="Request" value={`${latest.request.merchant ?? "unknown"} / ${latest.request.amount_usd ?? "0"} ${latest.request.token ?? "USDC"}`} />
            <Fact label="Decision reason" value={label(latest.decision.reason)} />
            <Fact label="Policy checks" value={`${latest.decision.rules_checked_count} checks / ${latest.decision.rules_triggered.length} triggered`} />
            <Fact label="Screening" value={`${label(latest.decision.screening_status)} via ${latest.decision.screening_provider ?? "provider not recorded"}`} />
            <Fact label="Mandate hash" value={shortHash(latest.proof.mandate_hash)} mono />
            <Fact label="Request hash" value={shortHash(latest.proof.payment_request_hash)} mono />
          </div>
        </section>
      ) : null}

      <section className="metal-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Decision factor table</p>
            <h2 className="mt-1 text-2xl font-semibold">Recent agent requests</h2>
          </div>
          <p className="text-sm text-slate-500">
            {report.stats.approved ?? 0} approved / {report.stats.blocked ?? 0} blocked / {report.stats.review ?? 0} review in latest sample
          </p>
        </div>
        <div className="mt-4 overflow-auto rounded-2xl border border-white/70 bg-white/75">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Agent</th>
                <th className="p-3">Request</th>
                <th className="p-3">Decision</th>
                <th className="p-3">Necessary factors</th>
                <th className="p-3">Audit proof</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t align-top">
                  <td className="p-3 font-medium">{row.agent_name}</td>
                  <td className="p-3">
                    <p>{row.request.merchant ?? "unknown merchant"}</p>
                    <p className="text-slate-500">
                      {row.request.amount_usd ?? "0"} {row.request.token ?? "USDC"} on {row.request.chain ?? "chain not recorded"}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{row.request.id ?? "request id pending"}</p>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.decision.status)}`}>
                      {label(row.decision.status)}
                    </span>
                    <p className="mt-2 text-slate-600">{label(row.decision.reason)}</p>
                  </td>
                  <td className="p-3 text-slate-600">
                    <p>{row.decision.rules_checked_count} policy checks</p>
                    <p>{row.decision.approval_required ? "Human approval required" : "No human approval required"}</p>
                    <p>Screening: {label(row.decision.screening_status)}</p>
                    {row.decision.rules_triggered.length ? (
                      <p>Triggered: {row.decision.rules_triggered.map((rule) => label(rule.reason)).join(", ")}</p>
                    ) : (
                      <p>Triggered: none</p>
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-600">
                    <p>mandate {shortHash(row.proof.mandate_hash)}</p>
                    <p>request {shortHash(row.proof.payment_request_hash)}</p>
                    {row.proof.receipt_id ? <p>receipt {row.proof.receipt_id}</p> : null}
                    {row.proof.case_id ? <p>case {row.proof.case_id}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? (
            <div className="border-t bg-white p-4 text-sm text-slate-500">
              No decisions have been recorded yet. Open the live demo once to warm the public sandbox.
            </div>
          ) : null}
        </div>
      </section>

      <section className="metal-card rounded-3xl p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hash-linked audit trail</p>
        <h2 className="mt-1 text-2xl font-semibold">Latest audit events</h2>
        <div className="mt-4 grid gap-2">
          {report.audit_trail.length ? (
            report.audit_trail.slice(0, 10).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/70 bg-white/75 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{event.type}</strong>
                  <span className="text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-slate-600">
                  Subject {event.subject_id ?? "none"} {event.case_id ? `/ case ${event.case_id}` : ""}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  prev {shortHash(event.previous_event_hash)} / event {shortHash(event.event_hash)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4 text-sm text-slate-600">
              Audit events are held inside the in-memory runtime while no Postgres database is attached. The status page
              still verifies the active hash chain on every request.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metricLabel}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function Fact({ label: factLabel, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{factLabel}</p>
      <p className={`mt-1 break-words ${mono ? "font-mono text-xs" : "font-medium"}`}>{value}</p>
    </div>
  );
}
