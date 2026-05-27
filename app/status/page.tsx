import { getSystemStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      {label}
    </span>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "No record";
  return new Date(value).toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" });
}

export default async function StatusPage() {
  const status = await getSystemStatus();
  const databaseOk = status.database === "connected" || status.database === "memory_fallback";

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">System health</p>
        <h1 className="mt-2 text-3xl font-bold">Status</h1>
        <p className="mt-1 text-slate-600">
          Server-rendered health for the public AgentPay Guard sandbox. Updated{" "}
          {new Date().toLocaleString("en-HK", { timeZone: "Asia/Hong_Kong" })}.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Badge
          ok={databaseOk}
          label={status.database === "connected" ? "Database connected" : "Memory fallback active"}
        />
        <Badge
          ok={status.audit_chain_valid}
          label={status.audit_chain_valid ? "Audit chain valid" : "Audit chain needs review"}
        />
        <Badge ok={status.demo_mode} label={status.demo_mode ? "Demo mode active" : "Demo mode off"} />
      </div>

      {status.message ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {status.message}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Audit events" value={status.audit_event_count} />
        <MetricCard label="Decisions" value={status.counts.decisions} />
        <MetricCard label="Live feed rows" value={status.counts.live_feed} />
        <MetricCard
          label="Last automation tick"
          value={status.last_cron_at ? new Date(status.last_cron_at).toLocaleTimeString("en-HK") : "No record"}
          sub={status.last_cron_agent ? `Agent: ${status.last_cron_agent}` : formatDate(status.last_cron_at)}
        />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Subsystem health
        </p>
        <div className="divide-y divide-slate-100 text-sm">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-slate-700">Persistence layer</span>
            <Badge ok={databaseOk} label={status.database === "connected" ? "Postgres online" : "Warm memory fallback"} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-slate-700">Audit hash chain</span>
            <Badge ok={status.audit_chain_valid} label={status.audit_chain_valid ? "Valid" : "Needs review"} />
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-slate-700">Vercel scheduled tick</span>
            <Badge ok={Boolean(status.last_cron_at)} label={status.last_cron_at ? "Tick recorded" : "Awaiting tick"} />
          </div>
        </div>
      </div>
    </div>
  );
}
