"use client";

import { useState } from "react";

function extractEvents(pack: Record<string, unknown>) {
  const direct = pack.audit_events;
  const scoped = pack.scoped_audit_events;
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(scoped)) return scoped;
  return [];
}

function looksLikeJson(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setResult("");
    try {
      const trimmed = input.trim();
      if (!trimmed) throw new Error("Enter a payment request ID or paste an evidence pack JSON.");

      let pack: Record<string, unknown>;
      if (looksLikeJson(trimmed)) {
        pack = JSON.parse(trimmed) as Record<string, unknown>;
      } else {
        const res = await fetch(`/api/evidence-packs/${encodeURIComponent(trimmed)}`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof body.error === "string" ? body.error : "Could not fetch evidence pack.");
        }
        pack = body as Record<string, unknown>;
      }

      const events = extractEvents(pack);
      const res = await fetch("/api/audit/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ events })
      });
      const body = await res.json();
      setResult(
        JSON.stringify(
          {
            payment_request_id:
              (pack.payment_request as { id?: string } | undefined)?.id ??
              (typeof pack.payment_request_id === "string" ? pack.payment_request_id : trimmed),
            audit_events_checked: events.length,
            verification: body,
            evidence_pack: pack
          },
          null,
          2
        )
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Evidence verifier</p>
        <h1 className="mt-2 text-3xl font-bold">Verify an AgentPay Guard case</h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Enter a payment request ID from the live feed, or paste an exported evidence pack JSON. The verifier fetches
          the case evidence and checks the hash-linked audit chain.
        </p>
      </div>
      <textarea
        className="h-36 w-full rounded-lg border p-3 font-mono text-xs"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="payreq_... or { &quot;audit_events&quot;: [ ... ] }"
      />
      <button
        type="button"
        disabled={busy}
        onClick={verify}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Verifying..." : "Verify evidence"}
      </button>
      <pre className="max-h-[36rem] overflow-auto rounded-lg border bg-white p-4 text-sm">{result || "Verification output will appear here."}</pre>
    </div>
  );
}
