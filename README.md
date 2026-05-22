# KYA Demo (public sandbox)

Public **Know Your Agent** demo: mandate-bound agent payments, policy decisions, mock settlement, and tamper-evident audit — on **Netlify** + **Netlify Database/Postgres**.

> **DEMO MODE** — Synthetic data only. No real funds.

## What you get

| Surface | URL | Who |
|---------|-----|-----|
| Public demo | `/demo` | Investors — live agent feed |
| Integrator docs | `/integrate` | Developers — API how-to |
| **Backstage** | `/admin` | You / your boss — stats, DB tables, **API keys** |
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

Set `REQUIRE_DEMO_API_KEY=true` in production to block anonymous API use.

## Boss monitoring (Netlify Database)

- **In-app:** `/admin` → overview, tables, API keys (login with `ADMIN_TOKEN`).
- **Netlify Dashboard:** Database → production → table editor / SQL console for a professional SQL view.

Data lives in Postgres (`kya_*` tables), not in the page HTML.

## Local setup

```bash
cd kya-demo
cp .env.example .env.local
# Netlify Database → production → connection strings
npm install
npx prisma db push
npm run dev
```

- Demo: http://localhost:3000/demo  
- Backstage: http://localhost:3000/admin (use `ADMIN_TOKEN` from `.env.local`)

## Deploy to Netlify (recommended)

See **[docs/DEPLOY_NETLIFY.md](docs/DEPLOY_NETLIFY.md)** — one-command bootstrap + GitHub Actions auto-deploy.

```bash
export NETLIFY_AUTH_TOKEN=nfp_...
cd kya-demo
npm install
npm run netlify:bootstrap
# set env vars in Netlify UI, then:
npx prisma db push
npm run netlify:deploy
```

Cron: `netlify/functions/scheduled-demo-tick.mts` hits `/api/cron/demo-tick` every 5 minutes.

## API summary

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/demo/seed` | Public |
| POST | `/api/demo/tick` | Public |
| POST | `/api/payment-requests/check` | `x-agentpay-api-key` (if required) |
| POST | `/api/payment-requests/:id/execute-mock` | API key |
| GET | `/api/evidence-packs/:id` | API key |
| GET | `/api/admin/overview` | `ADMIN_TOKEN` |
| POST | `/api/admin/keys` | `ADMIN_TOKEN` |
