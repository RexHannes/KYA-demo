"use client";

import { useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "kya_admin_token";
const SESSION_KEY = "kya_admin_token_expires_at";
const SESSION_MS = 30 * 60 * 1000;

export function getAdminToken() {
  if (typeof window === "undefined") return "";
  const expiresAt = Number(sessionStorage.getItem(SESSION_KEY) ?? 0);
  if (expiresAt && expiresAt <= Date.now()) {
    clearAdminToken();
    return "";
  }
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token);
  sessionStorage.setItem(SESSION_KEY, String(Date.now() + SESSION_MS));
}

export function clearAdminToken() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function adminHeaders(): HeadersInit {
  const token = getAdminToken();
  return token
    ? { authorization: `Bearer ${token}`, "content-type": "application/json" }
    : { "content-type": "application/json" };
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => getAdminToken());
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(() => Boolean(getAdminToken()));

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      fetch("/api/admin/overview", {
        headers: { authorization: `Bearer ${token}` }
      })
        .then((res) => {
          if (!res.ok) throw new Error("invalid_token");
          if (!cancelled) setVerified(true);
        })
        .catch(() => {
          if (cancelled) return;
          clearAdminToken();
          setToken("");
          setVerified(false);
          setError("Your saved admin token is no longer valid. Please enter the current ADMIN_TOKEN.");
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [token]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setChecking(true);
    const nextToken = input.trim();
    const res = await fetch("/api/admin/overview", {
      headers: { authorization: `Bearer ${nextToken}` }
    });
    if (!res.ok) {
      setError("Invalid admin token.");
      setChecking(false);
      return;
    }
    setAdminToken(nextToken);
    window.location.reload();
  }

  if (!token || !verified) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold">Backstage login</h1>
        <p className="text-sm text-slate-600">
          For operators only. Use the <code className="text-xs">ADMIN_TOKEN</code> from Netlify env or
          your <code className="text-xs">.env.local</code>. Sessions expire after 30 minutes.
        </p>
        <form onSubmit={login} className="space-y-3">
          <input
            type="password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Admin token"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={checking}
            className="w-full rounded-md bg-slate-900 py-2 text-sm text-white disabled:opacity-50"
          >
            {checking ? "Checking..." : "Enter backstage"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
