"use client";

import { useEffect, useState } from "react";

type Status = {
  database: string;
  demo_mode: boolean;
  audit_chain_valid: boolean;
  audit_event_count: number;
  last_cron_at: string | null;
  last_cron_agent: string | null;
  counts: {
    audit_events: number;
    decisions: number;
    live_feed: number;
  };
};

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

export default function StatusPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const load = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then((data: Status) => {
          setStatus(data);
          setLastUpdated(new Date());
        });
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">System health</p>
        <h1 className="mt-2 text-3xl font-bold">Status</h1>
        <p className="mt-1 text-slate-600">
          Live health for the public demo sandbox.
          {lastUpdated ? (
            <span className="ml-2 text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          ) : null}
        </p>
      </header>

      {!status ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Badge
              ok={status.database === "connected"}
              label={status.database === "connected" ? "Database connected" : "Database error"}
            />
            <Badge
              ok={status.audit_chain_valid}
              label={status.audit_chain_valid ? "Audit chain valid" : "Audit chain needs review"}
            />
            <Badge ok label="Demo mode active" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Audit events"
              value={status.audit_event_count ?? status.counts?.audit_events ?? 0}
            />
            <MetricCard label="Decisions" value={status.counts?.decisions ?? 0} />
            <MetricCard label="Live feed rows" value={status.counts?.live_feed ?? 0} />
            <MetricCard
              label="Last cron tick"
              value={
                status.last_cron_at
                  ? new Date(status.last_cron_at).toLocaleTimeString()
                  : "No record"
              }
              sub={
                status.last_cron_agent
                  ? `Agent: ${status.last_cron_agent}`
                  : status.last_cron_at
                    ? new Date(status.last_cron_at).toLocaleDateString()
                    : undefined
              }
            />
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Subsystem health
            </p>
            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-700">Postgres database</span>
                <Badge
                  ok={status.database === "connected"}
                  label={status.database === "connected" ? "Online" : "Error"}
                />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-700">Audit hash chain</span>
                <Badge
                  ok={status.audit_chain_valid}
                  label={status.audit_chain_valid ? "Valid" : "Needs review"}
                />
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-slate-700">Scheduled cron (every 5 min)</span>
                <Badge
                  ok={Boolean(status.last_cron_at)}
                  label={status.last_cron_at ? "Ticking" : "No record"}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
