"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FeedEvent = {
  id: string;
  at: string;
  agent_slug: string;
  agent_name: string;
  phase: string;
  message?: string;
  payment_request?: { merchant?: string; amount_usd?: string; id?: string };
  decision?: { status?: string; reason?: string };
  llm?: { item_description?: string; reasoning?: string };
};

const showcase = [
  {
    agent: "ProcurementBot",
    status: "approved",
    merchant: "staples.demo",
    amount: "12.50",
    reason: "within mandate and auto-approve limit"
  },
  {
    agent: "ResearchBot",
    status: "blocked",
    merchant: "sanctioned-example.test",
    amount: "48.00",
    reason: "screening hit or denied counterparty"
  },
  {
    agent: "TravelBot",
    status: "review",
    merchant: "hotels.demo",
    amount: "118.00",
    reason: "above auto-approve threshold"
  }
];

export function LiveFeedPanel() {
  const router = useRouter();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [stats, setStats] = useState<Record<string, { approved: number; blocked: number; pending: number }>>({});
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/demo/live-feed?limit=30");
    if (!res.ok) {
      setError("Live feed API is not responding.");
      return null;
    }
    const data = await res.json();
    setEvents(data.events ?? []);
    setStats(data.stats?.by_agent ?? {});
    setFallback(data.fallback ?? null);
    setError("");
    return data as { events?: FeedEvent[] };
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    async function warmDemo() {
      try {
        await fetch("/api/demo/seed", { method: "POST" });
        const first = await refresh();
        const hasDecisions = first?.events?.some((event) => event.phase === "decision");
        if (!hasDecisions) {
          for (const agent_slug of ["procurement", "research", "travel"]) {
            await fetch("/api/demo/tick", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ agent_slug })
            });
          }
          await refresh();
        }
      } catch {
        await refresh();
      } finally {
        if (!mounted) return;
        intervalId = setInterval(refresh, 2000);
      }
    }

    void warmDemo();

    return () => {
      mounted = false;
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [refresh]);

  async function tick(slug?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/tick", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(slug ? { agent_slug: slug } : {})
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Tick failed");
      }
      const data = await res.json().catch(() => ({}));
      const paymentRequestId = data?.result?.result?.payment_request?.id;
      await refresh();
      if (paymentRequestId) {
        router.push(`/demo/cases/${encodeURIComponent(paymentRequestId)}`);
      }
    } catch (error) {
      setError(error instanceof Error ? `Could not run agent tick: ${error.message}` : "Could not run agent tick.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="metal-card technical-grid space-y-5 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Case-file control plane</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Agent requests and audit decisions</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Every sandbox payment decision becomes an inspectable authority case file.
          </p>
        </div>
        <div className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600">
          {fallback === "memory" ? "Memory fallback active" : "Postgres connected"}
        </div>
      </div>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={() => tick("procurement")} className="chrome-button rounded-full px-4 py-2 text-sm font-medium">
          Run ProcurementBot
        </button>
        <button type="button" disabled={busy} onClick={() => tick("research")} className="chrome-button rounded-full px-4 py-2 text-sm font-medium">
          Run ResearchBot
        </button>
        <button type="button" disabled={busy} onClick={() => tick("travel")} className="chrome-button rounded-full px-4 py-2 text-sm font-medium">
          Run TravelBot
        </button>
        <button type="button" disabled={busy} onClick={() => tick()} className="chrome-button rounded-full px-4 py-2 text-sm font-medium">
          Run next agent
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {(Object.keys(stats).length
          ? Object.entries(stats)
          : [
              ["procurement", { approved: 1, blocked: 0, pending: 0 }],
              ["research", { approved: 0, blocked: 1, pending: 0 }],
              ["travel", { approved: 0, blocked: 0, pending: 1 }]
            ] as Array<[string, { approved: number; blocked: number; pending: number }]>
        ).map(([slug, counts]) => (
          <div key={slug} className="rounded-2xl border border-white/70 bg-white/72 p-4 text-sm shadow-sm backdrop-blur">
            <strong className="capitalize">{slug}</strong>
            <p className="mt-1 text-slate-600">
              {counts.approved} approved · {counts.blocked} blocked · {counts.pending} review
            </p>
          </div>
        ))}
      </div>

      <div className="max-h-96 space-y-2 overflow-auto pr-1">
        {events.length === 0 ? (
          <div className="grid gap-2">
            {showcase.map((item) => (
              <article
                key={item.agent}
                className={`rounded-2xl border bg-white/76 p-4 text-sm shadow-sm backdrop-blur ${
                  item.status === "approved"
                    ? "border-l-4 border-l-emerald-500"
                    : item.status === "blocked"
                      ? "border-l-4 border-l-red-500"
                      : "border-l-4 border-l-amber-500"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <strong>{item.agent}</strong>
                  <span className="text-slate-500">warming live case</span>
                </div>
                <p>
                  decision — {item.status} ({item.reason})
                </p>
                <p className="text-slate-600">
                  {item.merchant} · {item.amount} USDC
                </p>
              </article>
            ))}
          </div>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className={`rounded-2xl border bg-white/76 p-4 text-sm shadow-sm backdrop-blur ${
                event.decision?.status === "approved"
                  ? "border-l-4 border-l-emerald-500"
                  : event.decision?.status === "blocked"
                    ? "border-l-4 border-l-red-500"
                    : "border-l-4 border-l-amber-500"
              }`}
            >
              <div className="flex justify-between gap-2">
                <strong>{event.agent_name}</strong>
                <span className="text-slate-500">{new Date(event.at).toLocaleTimeString()}</span>
              </div>
              <p>
                {event.phase} — {event.decision?.status ?? "info"} ({event.decision?.reason ?? event.message})
              </p>
              <p className="text-slate-600">
                {event.payment_request?.merchant} · {event.payment_request?.amount_usd} USDC
              </p>
              {event.llm?.item_description ? <p className="text-slate-500">{event.llm.item_description}</p> : null}
              {event.payment_request?.id ? (
                <Link
                  href={`/demo/cases/${encodeURIComponent(event.payment_request.id)}`}
                  className="mt-3 inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  View evidence
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
