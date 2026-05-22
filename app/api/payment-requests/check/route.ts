import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { checkPaymentRequest, recordApiKeyUsage } from "@/lib/payments";
import { readJsonBody } from "@/lib/http";
import { formatZodError, paymentCheckSchema } from "@/lib/payment-validation";

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
    if ("keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId, request);
    const result = await checkPaymentRequest(validation.data, `integrator:${auth.label}`);
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
