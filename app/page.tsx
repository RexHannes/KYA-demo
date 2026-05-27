import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AgentPay Guard</p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight">
          Mandate enforcement for AI agents — every payment decision, auditable before it hits the chain
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Define what your agents can spend, who authorised it, and why. Get tamper-evident proof for every
          approval, block, or escalation — without touching the settlement layer.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open live demo
        </Link>
        <Link href="/integrate" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Integrate your agent
        </Link>
        <Link href="/report" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          Evidence report
        </Link>
        <Link href="/status" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50">
          System status
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mandate enforcement</p>
          <p className="mt-2 text-sm text-slate-700">
            Agents operate within signed mandates — allowed merchants, token limits, daily caps, and action scopes.
            Every check runs before any settlement.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Policy decisions</p>
          <p className="mt-2 text-sm text-slate-700">
            Auto-approve, block, or escalate to human review based on amount thresholds, screening results,
            and allowlist/denylist rules — all configurable per mandate.
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tamper-evident audit</p>
          <p className="mt-2 text-sm text-slate-700">
            Every decision is SHA-256 hash-linked to the previous event. Export a self-contained evidence pack
            for any payment request — verifiable offline.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Sandbox only — synthetic data, no real funds, no production compliance conclusions.
      </p>
    </div>
  );
}
