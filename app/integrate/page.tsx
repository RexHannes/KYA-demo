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
        <a href="/admin/keys">/admin/keys</a> — backstage login required). Send it on every request:
      </p>
      <pre className="rounded-lg bg-slate-900 p-4 text-sm text-white">
        {`x-agentpay-api-key: kya_demo_...`}
      </pre>

      <h2>2. Seed demo principals (once)</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/demo/seed`}</pre>

      <h2>3. Check a payment</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm overflow-x-auto">{`POST ${base}/api/payment-requests/check
Content-Type: application/json
x-agentpay-api-key: YOUR_KEY

{
  "agent_id": "agt_...",
  "mandate_id": "mdt_...",
  "merchant": "api.vendor.com",
  "amount_usd": "12.50",
  "token": "USDC",
  "chain": "base",
  "purpose": "buy_api_credits",
  "idempotency_key": "unique-per-attempt",
  "merchant_request_id": "vendor-123",
  "nonce": "nonce-456"
}`}</pre>

      <h2>4. Execute mock payment (if approved)</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/payment-requests/{payment_request_id}/execute-mock`}</pre>

      <h2>5. Export evidence</h2>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`GET ${base}/api/evidence-packs/{payment_request_id}`}</pre>

      <p className="text-sm text-slate-600">
        Set <code>REQUIRE_DEMO_API_KEY=true</code> on the server to reject requests without a valid key.
      </p>
    </div>
  );
}
