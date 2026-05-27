export default function IntegratePage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-deployment.vercel.app";

  return (
    <div className="prose prose-slate max-w-none space-y-6">
      <h1>Integrate your agent</h1>
      <p>
        External agents can call the same policy engine as the live demo. All requests use{" "}
        <strong>mock settlement</strong> and <strong>demo data</strong> only.
      </p>

      <h2>1. Get an API key</h2>
      <p>
        Ask your operator for a demo integrator key (created in{" "}
        <a href="/admin/keys">/admin/keys</a> — backstage login required). Keys carry scopes, expiry,
        rate limits, and last-used metadata. Send the key on every integrator request:
      </p>
      <pre className="rounded-lg bg-slate-900 p-4 text-sm text-white">
        {`x-agentpay-api-key: kya_demo_...`}
      </pre>

      <h2>2. Seed demo principals (once)</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/demo/seed`}</pre>

      <h2>3. Check a payment</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm overflow-x-auto">{`curl -sS ${base}/api/payment-requests/check \\
  -H "content-type: application/json" \\
  -H "x-agentpay-api-key: YOUR_KEY" \\
  -d '{
    "agent_id": "agt_...",
    "mandate_id": "mdt_...",
    "merchant": "sanctioned-example.test",
    "amount_usd": "48.00",
    "token": "USDC",
    "chain": "base",
    "purpose": "purchase_dataset",
    "counterparty_wallet_address": "0xdead000000000000000000000000000000000000",
    "idempotency_key": "unique-per-attempt",
    "merchant_request_id": "vendor-123",
    "nonce": "nonce-456"
  }'`}</pre>

      <h2>Example DENY response</h2>
      <pre className="rounded-lg bg-slate-900 p-4 text-sm text-white overflow-x-auto">{`{
  "decision": {
    "status": "blocked",
    "reason": "screening_hit",
    "approval_required": false,
    "policy_version": "agentpay-demo-v1",
    "mandate_hash": "sha256:...",
    "rules_triggered": [
      {
        "id": "screening.counterparty",
        "action": "block",
        "reason": "sanctions_screening_match"
      }
    ]
  },
  "payment_request": {
    "id": "payreq_...",
    "merchant": "sanctioned-example.test",
    "amount_usd": "48.00",
    "token": "USDC",
    "chain": "base"
  },
  "case": {
    "id": "case_...",
    "status": "blocked"
  }
}`}</pre>

      <h2>4. Execute mock payment (if approved)</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/payment-requests/{payment_request_id}/execute-mock`}</pre>

      <h2>5. Export evidence</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`GET ${base}/api/evidence-packs/{payment_request_id}`}</pre>

      <p className="text-sm text-slate-600">
        Production deployments require valid API keys for integrator endpoints by default. Use{" "}
        <code>PUBLIC_DEMO_MODE=true</code> only when you intentionally want public sandbox demo actions.
      </p>
    </div>
  );
}
