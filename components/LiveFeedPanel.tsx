"use client";

import { useCallback, useEffect, useState } from "react";

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

export function LiveFeedPanel() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [stats, setStats] = useState<Record<string, { approved: number; blocked: number; pending: number }>>({});
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/demo/live-feed?limit=30");
    if (!res.ok) {
      setError("Live feed API is not responding.");
      return;
    }
    const data = await res.json();
    setEvents(data.events ?? []);
    setStats(data.stats?.by_agent ?? {});
    setFallback(data.fallback ?? null);
    setError("");
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refresh();
    }, 0);
    const id = setInterval(refresh, 2000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(id);
    };
  }, [refresh]);

  async function seed() {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/seed", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Seed failed");
      }
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? `Could not seed demo agents: ${error.message}` : "Could not seed demo agents.");
    } finally {
      setBusy(false);
    }
  }

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
      await refresh();
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
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live control plane</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Agent requests and audit decisions</h2>
        </div>
        <div className="rounded-full border border-slate-300/80 bg-white/70 px-3 py-1 text-xs text-slate-600">
          {fallback === "memory" ? "Memory fallback active" : "Netlify Postgres connected"}
        </div>
      </div>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => seed()}
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 disabled:opacity-50"
        >
          Seed Acme demo agents
        </button>
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
        {Object.entries(stats).map(([slug, counts]) => (
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
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white/50 p-5 text-sm text-slate-500">
            No events yet. Seed agents, then run a bot.
          </p>
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
            </article>
          ))
        )}
      </div>
    </section>
  );
}
