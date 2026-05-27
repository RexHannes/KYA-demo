export default function IntegratePage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://kya-demo-sandbox.vercel.app";

  return (
    <div className="prose prose-slate max-w-none space-y-6">
      <h1>Integrate your agent</h1>
      <p>
        External agents can call the same policy engine as the live demo. All requests use{" "}
        <strong>mock settlement</strong> and <strong>demo data</strong> only.
      </p>

      <h2>x402 / AgentKit integration</h2>
      <p>
        If your agent uses <strong>x402</strong> (HTTP 402 Payment Required) or an AgentKit wallet
        (Coinbase, AWS Bedrock AgentCore, or similar), route the pre-settlement check to AgentPay
        Guard <em>before</em> signing:
      </p>
      <ol>
        <li>Agent receives a <code>402 Payment Required</code> response from a paid API or data endpoint.</li>
        <li>
          POST the payment details to{" "}
          <code>/api/payment-requests/check</code> — mandate scope, counterparty screening, and
          spending limits are evaluated instantly.
        </li>
        <li>
          If <code>decision.status === &quot;approved&quot;</code>, proceed to wallet signing and
          x402 settlement.
        </li>
        <li>
          Attach <code>decision.id</code> (the evidence pack reference) to your transaction
          metadata — this is your audit trail linking the on-chain tx to the policy decision.
        </li>
      </ol>
      <p className="not-prose rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <strong>Why this matters:</strong> a misconfigured agent does not just give a wrong answer —
        it signs a transaction. AgentPay Guard is the policy, compliance, and evidence layer that
        stands between the agent decision and the wallet.
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
      <p>Creates the Acme Demo Holdings principal, three agents, and their mandates. Safe to call repeatedly — idempotent.</p>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/demo/seed`}</pre>

      <h2>3. Check a payment</h2>
      <p>Submit a payment request. The guard checks mandate scope, limits, screening, and returns a decision immediately.</p>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm overflow-x-auto">{`curl -X POST ${base}/api/payment-requests/check \\
  -H "Content-Type: application/json" \\
  -H "x-agentpay-api-key: YOUR_KEY" \\
  -d '{
    "agent_id": "agt_...",
    "mandate_id": "mdt_...",
    "merchant": "api.vendor.com",
    "amount_usd": "12.50",
    "token": "USDC",
    "chain": "base",
    "purpose": "buy_api_credits",
    "idempotency_key": "req-unique-001",
    "nonce": "nonce-abc-001"
  }'`}</pre>

      <h2>Travel Rule fields (required above $1,000)</h2>
      <p>
        FATF Travel Rule applies to transfers of $1,000 USD or more. Include originator data or the
        request is rejected with <code>TRAVEL_RULE_DATA_MISSING</code>.
      </p>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm overflow-x-auto">{`curl -X POST ${base}/api/payment-requests/check \\
  -H "Content-Type: application/json" \\
  -H "x-agentpay-api-key: YOUR_KEY" \\
  -d '{
    "agent_id": "agt_...",
    "mandate_id": "mdt_...",
    "merchant": "api.vendor.com",
    "amount_usd": "1500.00",
    "token": "USDC",
    "chain": "base",
    "purpose": "buy_api_credits",
    "idempotency_key": "req-unique-002",
    "nonce": "nonce-abc-002",
    "originator_name": "Acme Corp",
    "originator_address": "123 Main St, New York NY 10001",
    "originator_account_id": "acct_acme_001"
  }'`}</pre>

      <p className="not-prose mt-1 text-sm font-medium text-slate-700">Example response — blocked decision:</p>
      <pre className="rounded-lg bg-slate-900 p-4 text-sm text-white overflow-x-auto">{`{
  "payment_request": {
    "id": "pr_01J9mxk2p4qr8s",
    "agent_id": "agt_01J8abc...",
    "mandate_id": "mdt_01J8def...",
    "merchant": "api.vendor.com",
    "amount_usd": "12.50",
    "token": "USDC",
    "chain": "base",
    "purpose": "buy_api_credits"
  },
  "decision": {
    "id": "dec_01J9mxk2p9zt3u",
    "status": "blocked",
    "reason": "block_denylisted_merchant",
    "approval_required": false,
    "rules_checked": [
      "block_inactive_or_revoked_mandate",
      "block_expired_mandate",
      "block_disallowed_merchant",
      "block_denylisted_merchant"
    ],
    "rules_triggered": [
      {
        "id": "block_denylisted_merchant",
        "action": "block",
        "reason": "block_denylisted_merchant"
      }
    ],
    "mandate_hash": "sha256:3a7f1c9b2e4d8f0a...",
    "payment_request_hash": "sha256:b5e2a1d3c8f6e0b9...",
    "policy_version": "v1"
  },
  "case": {
    "id": "case_01J9mxk2pabc4v",
    "status": "blocked",
    "risk_level": "high",
    "decision_reason": "block_denylisted_merchant"
  }
}`}</pre>

      <h2>4. Execute mock payment (if approved)</h2>
      <p>Only valid when <code>decision.status === &quot;approved&quot;</code>. Records a synthetic receipt and tx hash.</p>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`POST ${base}/api/payment-requests/{payment_request_id}/execute-mock
x-agentpay-api-key: YOUR_KEY`}</pre>

      <h2>5. Export evidence pack</h2>
      <p>
        Returns a self-contained JSON blob: principal, approver, agent, mandate, decision, receipt or case,
        and the scoped hash-linked audit trail. Paste it into{" "}
        <a href="/verify">/verify</a> to check the chain offline.
      </p>
      <pre className="rounded-lg bg-slate-100 p-4 text-sm">{`GET ${base}/api/evidence-packs/{payment_request_id}
x-agentpay-api-key: YOUR_KEY`}</pre>

      <h2>Decision statuses</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>approved</code></td><td>All rules passed; amount within auto-approve limit</td></tr>
          <tr><td><code>pending_human_approval</code></td><td>Passed policy but exceeds auto-approve threshold</td></tr>
          <tr><td><code>manual_review</code></td><td>Screening flagged; routed to human review</td></tr>
          <tr><td><code>blocked</code></td><td>Hard block rule triggered (denylist, hard limit, etc.)</td></tr>
        </tbody>
      </table>

      <p className="text-sm text-slate-600">
        Production deployments require valid API keys for integrator endpoints by default. Use{" "}
        <code>PUBLIC_DEMO_MODE=true</code> only when you intentionally want public sandbox demo actions.
      </p>
    </div>
  );
}
