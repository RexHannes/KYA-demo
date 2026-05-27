import { LiveFeedPanel } from "@/components/LiveFeedPanel";

export default function DemoPage() {
  return (
    <div className="space-y-7">
      <header className="metal-card rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AgentPay Guard sandbox</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Live agent authority console</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Acme Demo Holdings — ProcurementBot, ResearchBot, and TravelBot submit live sandbox authority checks for mock-payment decisions.
        </p>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
            <strong>1. Agent request</strong>
            <p className="mt-1 text-slate-600">A bot proposes merchant, amount, purpose and chain.</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
            <strong>2. Guard decision</strong>
            <p className="mt-1 text-slate-600">Mandate, screening and limits return approve/block/review.</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
            <strong>3. Audit proof</strong>
            <p className="mt-1 text-slate-600">Every decision is hash-linked for verification.</p>
          </div>
        </div>
      </header>
      <LiveFeedPanel />
    </div>
  );
}
