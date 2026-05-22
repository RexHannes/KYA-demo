# Deploy KYA Demo to Netlify

## One-time setup

### 1. Netlify Database

1. Create/open the Netlify project database.
2. Open **Database → production → Connect**.
3. Copy the **read/write** URI → `DATABASE_URL`.
4. Use the same read/write URI for `DIRECT_URL`.
5. Run schema:

```bash
cd kya-demo
cp .env.example .env.local
# edit DATABASE_URL + DIRECT_URL
npx prisma db push
```

### 2. Netlify personal access token

1. https://app.netlify.com/user/applications → **New access token**
2. Export: `export NETLIFY_AUTH_TOKEN=nfp_...`

### 3. Create site (automated)

```bash
cd kya-demo
npm install
npm run netlify:bootstrap
```

This creates a site and writes `.netlify/state.json` with `siteId`.

### 4. Netlify environment variables

Site → **Project configuration** → **Environment variables**:

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | Netlify Database read/write connection string |
| `DIRECT_URL` | Same Netlify Database read/write connection string |
| `ADMIN_TOKEN` | long random string (backstage `/admin`) |
| `CRON_SECRET` | long random string |
| `DEMO_MODE` | `true` |
| `NEXT_PUBLIC_APP_URL` | `https://YOUR-SITE.netlify.app` |
| `REQUIRE_DEMO_API_KEY` | `false` (or `true` after issuing keys) |

### 5. First production deploy

```bash
cd kya-demo
npm run netlify:deploy
```

Open the URL Netlify prints → `/demo` → **Seed Acme demo agents**.

---

## GitHub Actions (auto deploy on push)

Add repository secrets (Casemap4 repo → Settings → Secrets):

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID` (from `kya-demo/.netlify/state.json`)
- `DATABASE_URL`
- `DIRECT_URL`
- `KYA_ADMIN_TOKEN` (same as `ADMIN_TOKEN`)
- `KYA_CRON_SECRET` (same as `CRON_SECRET`)

Push to `codex/casemap4-paragraph-index-v2` or `main` with changes under `kya-demo/`.

---

## Monorepo note

If you connect Netlify to GitHub **without** Actions, set:

- **Base directory:** `kya-demo`
- **Build command:** `npm run build`
- **Publish:** leave default (Next.js plugin handles it)

---

## Scheduled demo agents

`netlify/functions/scheduled-demo-tick.mts` calls `/api/cron/demo-tick` every 5 minutes so the live feed stays active.

---

## Boss backstage

- **https://YOUR-SITE.netlify.app/admin** (use `ADMIN_TOKEN`)
- Or Netlify **Database → production → table editor** on the same database
