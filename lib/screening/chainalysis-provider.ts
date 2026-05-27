import type { ExternalScreeningResult, RiskLevel, VendorScreeningProvider, VendorScreeningResult } from "./index";

function mapChainalysisRisk(risk: string): RiskLevel {
  const map: Record<string, RiskLevel> = {
    lowRisk: "LOW",
    mediumRisk: "MEDIUM",
    highRisk: "HIGH",
    severe: "CRITICAL"
  };
  return map[risk] ?? "MEDIUM";
}

export async function chainalysisScreenAddress(
  address: string,
  apiKey: string
): Promise<ExternalScreeningResult> {
  const res = await fetch(`https://api.chainalysis.com/api/kyt/v2/users/${encodeURIComponent(address)}/transfers`, {
    headers: {
      Token: apiKey,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) {
    throw new Error(`Chainalysis API error: ${res.status}`);
  }
  const data = await res.json();
  return {
    address,
    riskScore: typeof data.riskScore === "number" ? data.riskScore : 0,
    riskLevel: mapChainalysisRisk(String(data.risk ?? "")),
    flags: Array.isArray(data.exposures) ? data.exposures.map((e: { category?: string }) => e.category ?? "unknown") : [],
    provider: "chainalysis",
    checkedAt: new Date().toISOString()
  };
}

function buildVendorResult(
  provider: string,
  checks: VendorScreeningResult["checks"]
): VendorScreeningResult {
  const blocked = checks.some((c) => c.status === "flagged");
  return {
    provider,
    status: blocked ? "flagged" : "clear",
    blocked,
    reason: blocked ? "screening_hit" : "screening_clear",
    checks
  };
}

export function createChainalysisPreloadedProvider(
  address: string,
  screeningResult: ExternalScreeningResult
): VendorScreeningProvider {
  const flagged = screeningResult.riskLevel === "HIGH" || screeningResult.riskLevel === "CRITICAL";
  return {
    id: "chainalysis_kyt_v2",
    screenPaymentRequest({ paymentRequest }) {
      const wallet = String(paymentRequest.counterparty_wallet_address ?? address);
      return buildVendorResult("chainalysis_kyt_v2", [
        {
          type: "wallet",
          target: wallet,
          status: flagged ? "flagged" : "clear",
          source: "chainalysis_kyt"
        }
      ]);
    }
  };
}
