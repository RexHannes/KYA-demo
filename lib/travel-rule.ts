const TRAVEL_RULE_THRESHOLD_USD = 1000;

export interface TravelRuleData {
  originator_name: string;
  originator_address: string;
  originator_account_id: string;
}

export function isTravelRuleRequired(amountUsd: number): boolean {
  return amountUsd >= TRAVEL_RULE_THRESHOLD_USD;
}

export function validateTravelRuleData(
  data: Partial<Record<keyof TravelRuleData, unknown>>
): { valid: boolean; missing: string[] } {
  const required: (keyof TravelRuleData)[] = [
    "originator_name",
    "originator_address",
    "originator_account_id"
  ];
  const missing = required.filter((f) => !data[f]);
  return { valid: missing.length === 0, missing };
}

export const TRAVEL_RULE_THRESHOLD = TRAVEL_RULE_THRESHOLD_USD;
