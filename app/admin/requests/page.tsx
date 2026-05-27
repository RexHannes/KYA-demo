"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate, adminHeaders } from "@/components/AdminGate";

type RequestRow = {
  id: string;
  at: string;
  agent_slug: string;
  agent_name: string;
  merchant: string | null;
  amount_usd: string | null;
  token: string | null;
  chain: string | null;
  status: string | null;
  reason: string | null;
  payment_request_id: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

function statusClass(status: string | null) {
  if (status === "approved") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "blocked") return "text-red-700 bg-red-50 border-red-200";
  return "text-amber-800 bg-amber-50 border-amber-200";
}

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [agentFilter, setAgentFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (agentFilter.trim()) params.set("agent", agentFilter.trim());
    const res = await fetch(`/api/admin/requests?${params}`, { headers: adminHeaders() });
    const data = await res.json();
    setRows(data.requests ?? []);
    setPagination(data.pagination ?? null);
    setLoading(false);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(page);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilter(e: { preventDefault(): void }) {
    e.preventDefault();
    setPage(1);
    void load(1);
  }

  return (
    <AdminGate>
      <div className="space-y-6">
        <header className="space-y-2">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">
            Backstage
          </Link>
          <h1 className="text-3xl font-bold">Payment requests</h1>
          <p className="text-slate-600">All policy decisions logged through the demo guard.</p>
        </header>

        <form onSubmit={handleFilter} className="flex gap-2">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            placeholder="Filter by agent slug…"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md border bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            Filter
          </button>
          {agentFilter ? (
            <button
              type="button"
              className="text-sm text-slate-500 underline"
              onClick={() => {
                setAgentFilter("");
                setPage(1);
                setTimeout(() => void load(1), 0);
              }}
            >
              Clear
            </button>
          ) : null}
        </form>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="overflow-auto rounded-xl border bg-white">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3">Time</th>
                    <th className="p-3">Agent</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Decision</th>
                    <th className="p-3">Reason</th>
                    <th className="p-3">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No requests yet —{" "}
                        <Link href="/demo" className="underline">
                          run the demo
                        </Link>{" "}
                        to generate data.
                      </td>
                    </tr>
                  ) : null}
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t align-top hover:bg-slate-50">
                      <td className="p-3 text-xs text-slate-500">
                        {new Date(row.at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <p className="font-medium">{row.agent_name}</p>
                        <p className="text-xs text-slate-400">{row.agent_slug}</p>
                      </td>
                      <td className="p-3">{row.merchant ?? "—"}</td>
                      <td className="p-3 tabular-nums">
                        {row.amount_usd ? (
                          <>
                            ${row.amount_usd} {row.token ?? "USDC"}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}
                        >
                          {row.status?.replace(/_/g, " ") ?? "—"}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {row.reason?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="p-3">
                        {row.payment_request_id ? (
                          <Link
                            href={`/demo/cases/${encodeURIComponent(row.payment_request_id)}`}
                            className="text-xs text-slate-600 underline hover:text-slate-900"
                          >
                            Case file
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.pages > 1 ? (
              <div className="flex items-center justify-between text-sm">
                <p className="text-slate-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </AdminGate>
  );
}
