"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyPage() {
  const router = useRouter();
  const [requestId, setRequestId] = useState("");
  const [jsonInput, setJsonInput] = useState("");
  const [result, setResult] = useState<string>("");
  const [verifying, setVerifying] = useState(false);

  function lookupById(e: React.FormEvent) {
    e.preventDefault();
    const id = requestId.trim();
    if (id) router.push(`/demo/cases/${encodeURIComponent(id)}`);
  }

  async function verifyJson(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setResult("");
    try {
      const pack = JSON.parse(jsonInput);
      const events = pack.audit_events ?? pack.scoped_audit_events ?? [];
      const res = await fetch("/api/audit/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events })
      });
      const body = await res.json();
      setResult(JSON.stringify(body, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Invalid JSON");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Evidence verification</p>
        <h1 className="mt-2 text-3xl font-bold">Verify a case file</h1>
        <p className="mt-1 text-slate-600">
          Look up any payment authority case by ID, or verify an exported evidence pack offline without
          accessing the database.
        </p>
      </header>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Look up by payment request ID</h2>
        <p className="mt-1 text-sm text-slate-600">
          Opens the full case file — authority chain, mandate scope, rule checklist, and audit timeline.
        </p>
        <form onSubmit={lookupById} className="mt-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm placeholder:text-slate-400"
            placeholder="pr_01J9..."
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Open case file
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-400">
          Payment request IDs appear on each event card in the{" "}
          <a href="/demo" className="underline">live demo</a> and in every evidence pack export.
        </p>
      </section>

      <section className="rounded-xl border bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold">Verify audit chain offline</h2>
        <p className="mt-1 text-sm text-slate-600">
          Paste an exported evidence pack JSON. The hash chain is verified client-side — no database access
          required.
        </p>
        <form onSubmit={verifyJson} className="mt-4 space-y-3">
          <textarea
            className="h-40 w-full rounded-lg border p-3 font-mono text-xs placeholder:text-slate-400"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={'{\n  "scoped_audit_events": [\n    { "id": "...", "event_hash": "...", "previous_event_hash": "..." },\n    ...\n  ]\n}'}
          />
          <button
            type="submit"
            disabled={verifying || !jsonInput.trim()}
            className="rounded-lg border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {verifying ? "Verifying…" : "Verify chain"}
          </button>
        </form>
        {result ? (
          <pre className="mt-3 rounded-lg border bg-slate-50 p-4 text-xs">{result}</pre>
        ) : null}
      </section>
    </div>
  );
}
