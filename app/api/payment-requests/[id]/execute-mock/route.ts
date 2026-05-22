import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { executeMockPaymentRequest, recordApiKeyUsage } from "@/lib/payments";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await assertIntegratorApiKey(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if ("keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId);
    const result = await executeMockPaymentRequest(id, `integrator:${auth.label}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.name : "error",
        message: error instanceof Error ? error.message : "execute_failed"
      },
      { status: 500 }
    );
  }
}
