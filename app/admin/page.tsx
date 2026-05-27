"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGate, adminHeaders } from "@/components/AdminGate";

type Overview = {
  audit_chain_valid: boolean;
  counts: Record<string, number>;
  api_keys: Array<{ id: string; label: string; keyPrefix: string; revokedAt: string | null }>;
  last_cron_at: string | null;
  require_demo_api_key: boolean;
};

export default function AdminHomePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/overview", { headers: adminHeaders() })
      .then((r) => {
        if (!r.ok) throw new Error("Could not load admin overview.");
        return r.json();
      })
      .then((data) => {
        if (!data?.counts) throw new Error("Admin overview response was incomplete.");
        setOverview(data);
        setError("");
      })
      .catch((err) => {
        setOverview(null);
        setError(err instanceof Error ? err.message : "Could not load admin overview.");
      });
  }, []);

  return (
    <AdminGate>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Operator backstage</h1>
          <p className="text-slate-600">
            Monitor demo KYA activity in Postgres. This area is not linked from the public demo.
          </p>
        </header>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        {overview ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Audit chain" value={overview.audit_chain_valid ? "Valid" : "Invalid"} />
            <StatCard label="Audit events" value={String(overview.counts.audit_events ?? 0)} />
            <StatCard label="Decisions" value={String(overview.counts.decisions ?? 0)} />
            <StatCard label="Payment requests" value={String(overview.counts.payment_requests ?? 0)} />
            <StatCard label="Live feed rows" value={String(overview.counts.live_feed ?? 0)} />
            <StatCard label="API keys" value={String(overview.api_keys?.length ?? 0)} />
          </div>
        ) : (
          <p className="text-sm text-slate-500">Loading overview…</p>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/data" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
            Database tables
          </Link>
          <Link href="/admin/keys" className="rounded-md border bg-white px-4 py-2 text-sm">
            Integrator API keys
          </Link>
          <Link href="/demo" className="rounded-md border bg-white px-4 py-2 text-sm">
            Public demo
          </Link>
          <Link href="/status" className="rounded-md border bg-white px-4 py-2 text-sm">
            Status
          </Link>
        </div>

      </div>
    </AdminGate>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
