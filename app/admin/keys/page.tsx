"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminGate, adminHeaders } from "@/components/AdminGate";

type KeyRow = {
  id: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
};

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [label, setLabel] = useState("partner_agent");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/keys", { headers: adminHeaders() });
    const data = await res.json();
    setKeys(data.keys ?? []);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function createKey() {
    const res = await fetch("/api/admin/keys", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ label })
    });
    const data = await res.json();
    if (data.key) setCreatedKey(data.key);
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/admin/keys?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: adminHeaders()
    });
    await load();
  }

  return (
    <AdminGate>
      <div className="space-y-6">
        <header className="space-y-2">
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-800">
            Backstage
          </Link>
          <h1 className="text-3xl font-bold">Integrator API keys</h1>
          <p className="text-slate-600">
            Issue keys for external agents calling <code className="text-xs">/api/payment-requests/check</code>.
            Keys are shown once at creation.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <input
            className="rounded-md border px-3 py-2 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label e.g. Acme partner bot"
          />
          <button
            type="button"
            onClick={createKey}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Create API key
          </button>
        </div>

        {createdKey ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
            <strong>Copy this key now:</strong>
            <pre className="mt-2 overflow-auto font-mono text-xs">{createdKey}</pre>
          </div>
        ) : null}

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-2">Label</th>
              <th>Prefix</th>
              <th>Created</th>
              <th>Last used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-b">
                <td className="py-2 font-medium">{key.label}</td>
                <td className="font-mono text-xs">{key.keyPrefix}…</td>
                <td>{new Date(key.createdAt).toLocaleString()}</td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "—"}</td>
                <td>
                  {key.revokedAt ? (
                    <span className="text-slate-400">Revoked</span>
                  ) : (
                    <button type="button" className="text-red-600" onClick={() => revoke(key.id)}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminGate>
  );
}
