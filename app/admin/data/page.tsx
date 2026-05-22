"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminGate, adminHeaders } from "@/components/AdminGate";

const TABLES = [
  "live_feed_events",
  "status_snapshot",
  "audit_events",
  "policy_decisions",
  "payment_requests",
  "agents",
  "mandates",
  "principals",
  "api_keys"
] as const;

export default function AdminDataPage() {
  const [table, setTable] = useState<(typeof TABLES)[number]>("audit_events");
  const [rows, setRows] = useState<unknown[]>([]);

  useEffect(() => {
    fetch(`/api/dashboard/${table}`, { headers: adminHeaders() })
      .then((r) => r.json())
      .then((data) => setRows(data.rows ?? []))
      .catch(() => setRows([]));
  }, [table]);

  return (
    <AdminGate>
      <div className="space-y-6">
        <header className="space-y-2">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">
            ← Backstage
          </Link>
          <h1 className="text-3xl font-bold">Demo database</h1>
          <p className="text-slate-600">Read-only view of Netlify Postgres demo data.</p>
        </header>
        <div className="flex flex-wrap gap-2">
          {TABLES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTable(name)}
              className={`rounded-md px-3 py-1 text-sm ${table === name ? "bg-slate-900 text-white" : "border bg-white"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="overflow-auto rounded-lg border bg-white">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-2">Preview</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((row, index) => (
                <tr key={index} className="border-t align-top">
                  <td className="p-2 font-mono whitespace-pre-wrap">
                    {JSON.stringify(row, null, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGate>
  );
}
