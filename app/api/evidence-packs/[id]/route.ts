import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { exportEvidencePack, recordApiKeyUsage } from "@/lib/payments";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await assertIntegratorApiKey(request, "evidence:read");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    if ("keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId, request);
    const pack = await exportEvidencePack(id);
    return NextResponse.json(pack);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "not_found" },
      { status: 404 }
    );
  }
}
