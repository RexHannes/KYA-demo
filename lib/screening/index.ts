export interface VendorScreeningCheck {
  type: string;
  target: string;
  status: "flagged" | "clear";
  source: string;
}

export interface VendorScreeningResult {
  provider: string;
  status: "flagged" | "clear";
  blocked: boolean;
  reason: string;
  checks: VendorScreeningCheck[];
}

export interface VendorScreeningProvider {
  id: string;
  screenPaymentRequest(context: {
    principal?: unknown;
    agent?: unknown;
    mandate?: unknown;
    paymentRequest: Record<string, unknown>;
  }): VendorScreeningResult;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ExternalScreeningResult {
  address: string;
  riskScore: number;
  riskLevel: RiskLevel;
  flags: string[];
  provider: string;
  checkedAt: string;
}
