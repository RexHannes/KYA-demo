import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">KYA / AgentPay Guard</p>
        <h1 className="text-4xl font-bold tracking-tight">Know Your Agent — payment authority demo</h1>
        <p className="max-w-2xl text-lg text-slate-600">
          Autonomous agents request purchases. Guard enforces mandates, screening, and tamper-evident audit
          before any mock settlement.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/demo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Open live demo
        </Link>
        <Link href="/integrate" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          Integrate your agent
        </Link>
        <Link href="/report" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          Evidence report
        </Link>
        <Link href="/status" className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold">
          System status
        </Link>
      </div>
      <ul className="list-disc space-y-2 pl-6 text-slate-600">
        <li>Demo data only — separate from any future production database.</li>
        <li>Hosted on Vercel with Postgres for persistence.</li>
        <li>Cron keeps the feed alive every 5 minutes on production deploys.</li>
      </ul>
    </div>
  );
}
