"use client";

import { useState } from "react";

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string>("");

  async function verify() {
    try {
      const pack = JSON.parse(input);
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
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Verify evidence pack</h1>
      <p className="text-slate-600">Paste an exported evidence pack JSON to verify the audit chain.</p>
      <textarea
        className="h-48 w-full rounded-lg border p-3 font-mono text-xs"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder='{ "audit_events": [ ... ] }'
      />
      <button type="button" onClick={verify} className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
        Verify chain
      </button>
      <pre className="rounded-lg border bg-white p-4 text-sm">{result}</pre>
    </div>
  );
}
