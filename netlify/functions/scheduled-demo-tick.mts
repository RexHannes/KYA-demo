import type { Config } from "@netlify/functions";

export const config: Config = {
  schedule: "*/5 * * * *"
};

export default async function handler() {
  const base =
    process.env.URL?.replace(/\/$/, "") ??
    process.env.DEPLOY_PRIME_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!base) {
    console.error("scheduled-demo-tick: missing site URL");
    return new Response("missing URL", { status: 500 });
  }

  const secret = process.env.CRON_SECRET;
  const headers: Record<string, string> = {};
  if (secret) headers.authorization = `Bearer ${secret}`;

  const response = await fetch(`${base}/api/cron/demo-tick`, { headers });
  const body = await response.text();
  console.log("scheduled-demo-tick", response.status, body.slice(0, 200));
  return new Response(body, { status: response.status });
}
