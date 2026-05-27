import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { checkPaymentRequest, recordApiKeyUsage } from "@/lib/payments";
import { readJsonBody } from "@/lib/http";
import { formatZodError, paymentCheckSchema } from "@/lib/payment-validation";
import { isTravelRuleRequired, validateTravelRuleData, TRAVEL_RULE_THRESHOLD } from "@/lib/travel-rule";

export async function POST(request: Request) {
  const auth = await assertIntegratorApiKey(request, "payment:check");
  if (!auth.ok) return auth.response;

  try {
    const parsed = await readJsonBody(request);
    if (!parsed.ok) return parsed.response;
    const validation = paymentCheckSchema.safeParse(parsed.data);
    if (!validation.success) {
      return NextResponse.json(
        { error: "validation_error", issues: formatZodError(validation.error) },
        { status: 400 }
      );
    }

    const body = validation.data;
    const amount = parseFloat(String(body.amount_usd));

    if (isTravelRuleRequired(amount)) {
      const trValidation = validateTravelRuleData({
        originator_name: body.originator_name,
        originator_address: body.originator_address,
        originator_account_id: body.originator_account_id
      });
      if (!trValidation.valid) {
        return NextResponse.json(
          {
            error: "travel_rule_data_missing",
            reason: "TRAVEL_RULE_DATA_MISSING",
            missing_fields: trValidation.missing,
            message: `Travel Rule data required for amounts >= $${TRAVEL_RULE_THRESHOLD}. Missing: ${trValidation.missing.join(", ")}`
          },
          { status: 422 }
        );
      }
    }

    if ("keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId, request);
    const result = await checkPaymentRequest(body, `integrator:${auth.label}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.name : "error",
        message: error instanceof Error ? error.message : "check_failed"
      },
      { status: error instanceof Error && error.name === "ValidationError" ? 400 : 500 }
    );
  }
}
