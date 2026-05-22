import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { checkPaymentRequest, recordApiKeyUsage } from "@/lib/payments";

export async function POST(request: Request) {
  const auth = await assertIntegratorApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    if ("keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId);
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
