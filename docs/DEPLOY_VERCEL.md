# Deploy KYA Demo to Vercel

This project is intended to deploy from GitHub into Vercel.

## 1. Push the latest branch to GitHub

Use a branch that includes the pitch-readiness hardening changes and this Vercel migration.

## 2. Import the GitHub project in Vercel

1. Open the Vercel dashboard.
2. Add New Project.
3. Import `RexHannes/KYA-demo`.
4. Framework preset: Next.js.
5. Root directory: repository root.
6. Build command: leave as detected unless you intentionally override it. The repository `vercel.json` already sets the production build command.

## 3. Add environment variables

Add these variables for Production. Use the same values for Preview if you want preview deployments to run against the same sandbox database.

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Pooled Postgres connection string |
| `DIRECT_URL` | Direct Postgres connection string for Prisma migrations |
| `ADMIN_TOKEN` | Long random string for `/admin` |
| `CRON_SECRET` | Long random string for the Vercel cron endpoint |
| `PUBLIC_DEMO_MODE` | `true` |
| `NEXT_PUBLIC_APP_URL` | Production Vercel URL, for example `https://kya-demo.vercel.app` |

Optional variables:

| Variable | Value |
|----------|-------|
| `REQUIRE_DEMO_API_KEY` | `true` to require API keys for demo-integrator endpoints outside the public UI |
| `DEMO_INTEGRATOR_API_KEY` | Compatibility key for controlled demo calls |

## 4. Deploy

Trigger a production deployment from Vercel. The build command runs:

```bash
prisma generate && prisma migrate deploy && next build
```

That applies committed Prisma migrations before the Next.js build.

## 5. Smoke test

After deployment, verify:

- `/`
- `/demo`
- `/integrate`
- `/status`
- `/admin`
- `/api/status`

The public demo auto-seeds on load when `PUBLIC_DEMO_MODE=true`. The cron route is configured in `vercel.json` and should advance the live feed every 5 minutes.
