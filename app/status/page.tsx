"use client";

import { useEffect, useState } from "react";

export default function StatusPage() {
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/status").then((r) => r.json()).then(setStatus);
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">System status</h1>
      <p className="text-slate-600">Live health for the public demo sandbox.</p>
      <pre className="rounded-lg border bg-white p-4 text-sm">{JSON.stringify(status, null, 2)}</pre>
    </div>
  );
}
