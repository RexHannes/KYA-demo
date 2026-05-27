# Security

## Auth model

**Admin access** — The `/admin` backstage and all `/api/admin/*` routes require an `ADMIN_TOKEN` environment variable. Requests supply it via the `x-admin-token` header. No token, no access.

**Integrator API keys** — External agents call `/api/payment-requests/check`, `/api/payment-requests/:id/execute-mock`, and `/api/evidence-packs/:id` using bearer keys (`x-agentpay-api-key: kya_demo_...`). Keys are stored as SHA-256 hashes and carry three scopes: `payment:check`, `payment:execute_mock`, `evidence:read`. Each key supports optional expiry and per-minute rate limiting enforced at the database layer.

**Public demo mode** — `/api/demo/seed`, `/api/demo/tick`, and public case-file viewing are open when `PUBLIC_DEMO_MODE=true`. In dev, they are open by default. `REQUIRE_DEMO_API_KEY=true` forces API key auth even in dev.

## Audit chain

Every policy decision appends an immutable event to `kya_audit_events`. Each event stores an `event_hash` (SHA-256 of its own content) and the `previous_event_hash` of the preceding event, forming a tamper-evident chain. The `/api/status` and `/api/admin/overview` endpoints verify the chain on every request.

## Known hardening gaps (sandbox only)

This is a proof-of-concept sandbox. The following gaps are known and accepted for demo purposes:

- **No request queue.** Concurrent agent ticks share a single Prisma connection pool; there is no job queue or optimistic locking for high-throughput workloads.
- **Rate limiting is advisory.** Per-minute limits on API keys are tracked in Postgres but not enforced atomically under concurrent load.
- **Admin token is a shared secret.** Production would replace this with operator SSO / RBAC.
- **No real provider integrations.** Payments are mock settlements; KYB/AML screening is synthetic.
- **Synthetic data only.** No real funds, no real compliance conclusions.

## Production hardening path

1. Replace `ADMIN_TOKEN` with operator identity provider (OIDC/SAML).
2. Introduce a job queue (e.g., BullMQ or Inngest) for concurrent agent ticks with idempotency keys.
3. Move rate-limit counters to Redis for atomic enforcement.
4. Add typed domain tables (payments, agents, mandates as first-class rows) with strong foreign-key constraints.
5. Integrate real KYB/AML screening providers and OFAC SDN list.
6. Enable row-level security in Postgres so each principal sees only its own data.
