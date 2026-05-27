# AgentPay Guard (public sandbox)

Public **mandate enforcement for AI agents** demo: mandate-bound agent payments, policy decisions, mock settlement, inspectable case files, and tamper-evident audit — deployed on **Vercel** with optional Postgres.

> **DEMO MODE** — Synthetic data only. No real funds, no real KYB/AML, and no production compliance conclusion.

## What you get

| Surface | URL | Who |
|---------|-----|-----|
| Public demo | `/demo` | Compliance reviewers — live sandbox authority checks |
| Case file | `/demo/cases/:payment_request_id` | Compliance reviewers — evidence-room view |
| Integrator docs | `/integrate` | Developers — API how-to |
| **Backstage** | `/admin` | Operators — stats, DB tables, **API keys** |
| Status | `/status` | Uptime + audit chain health |

`agentpay-guard/` (sibling folder) remains the **local** engine + terminal agents — unchanged.

## External agents + API keys

1. Log in to **`/admin`** with `ADMIN_TOKEN`.
2. Open **Integrator API keys** → **Create API key** (shown once).
3. External agent calls:

```bash
curl -X POST "$BASE/api/payment-requests/check" \
  -H "content-type: application/json" \
  -H "x-agentpay-api-key: kya_demo_..." \
  -d '{ "agent_id":"...", "mandate_id":"...", ... }'
```

Production integrator endpoints fail closed by default and require API keys. `REQUIRE_DEMO_API_KEY=true`
still forces keys in local/dev. `DEMO_INTEGRATOR_API_KEY` authenticates only when the caller actually sends it.

Public demo actions are open in local/dev. In production, set `PUBLIC_DEMO_MODE=true` to enable
`/api/demo/seed`, `/api/demo/tick`, and public case-file viewing.

## Operator monitoring

- `/admin` → overview, database tables, API key management (login with `ADMIN_TOKEN`).

Data lives in Postgres (`kya_*` tables), not in the page HTML.

The current Postgres bridge persists demo state and wraps guard execution in a transaction, but it is still
an investor/integrator sandbox. It is not yet a concurrent high-volume payment system; typed domain tables,
stronger database constraints, production auth, and real provider integrations remain future hardening work.

## Local setup

```bash
cd kya-demo
cp .env.example .env.local
# Postgres connection strings
npm install
npm run db:migrate
npm run dev
```

- Demo: http://localhost:3000/demo  
- Backstage: http://localhost:3000/admin (use `ADMIN_TOKEN` from `.env.local`)

## Deploy to Vercel

See **[docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md)** for the GitHub-backed Vercel setup.

Vercel should import `RexHannes/KYA-demo` directly from GitHub. Set these environment variables in the Vercel project before the first production deployment:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Pooled Postgres connection string for runtime queries |
| `DIRECT_URL` | Direct Postgres connection string for Prisma migrations |
| `ADMIN_TOKEN` | Long random string for `/admin` |
| `CRON_SECRET` | Long random string for `/api/cron/demo-tick` |
| `PUBLIC_DEMO_MODE` | `true` for the public sandbox |
| `NEXT_PUBLIC_APP_URL` | Final Vercel production URL |

Cron: `vercel.json` runs `/api/cron/demo-tick` daily on Vercel Hobby. On Vercel Pro, change the schedule back to `*/5 * * * *` if you want the feed to advance every 5 minutes.

## API summary

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/demo/seed` | Public |
| POST | `/api/demo/tick` | Public |
| GET | `/demo/cases/:payment_request_id` | Public demo mode |
| POST | `/api/payment-requests/check` | API key in production |
| POST | `/api/payment-requests/:id/execute-mock` | API key |
| GET | `/api/evidence-packs/:id` | API key |
| GET | `/api/admin/overview` | `ADMIN_TOKEN` |
| POST | `/api/admin/keys` | `ADMIN_TOKEN` |

API keys include scopes, optional expiry, optional per-minute rate limit, and last-used IP/user-agent metadata.
Default scopes are `payment:check`, `payment:execute_mock`, and `evidence:read`.
