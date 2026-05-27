import { chainalysisScreenAddress, createChainalysisPreloadedProvider } from "./chainalysis-provider";
import type { VendorScreeningProvider } from "./index";

export async function buildScreeningProvider(
  paymentRequest: Record<string, unknown>
): Promise<VendorScreeningProvider | undefined> {
  const apiKey = process.env.CHAINALYSIS_API_KEY?.trim();
  if (!apiKey) return undefined;

  const address = paymentRequest.counterparty_wallet_address;
  if (!address || typeof address !== "string") return undefined;

  try {
    const result = await chainalysisScreenAddress(address, apiKey);
    return createChainalysisPreloadedProvider(address, result);
  } catch (err) {
    console.error("Chainalysis screening failed, falling back to default provider:", err);
    return undefined;
  }
}
