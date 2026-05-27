import { NextResponse } from "next/server";
import { assertIntegratorApiKey } from "@/lib/auth";
import { exportEvidencePack, recordApiKeyUsage } from "@/lib/payments";
import { assertPublicDemoAccess, isPublicDemoEnabled } from "@/lib/demo-access";
import { hasDatabase } from "@/lib/prisma";
import { ensureMemoryShowcaseData, exportMemoryEvidencePack, listMemoryEvents } from "@/lib/memory-runtime";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const provided =
    request.headers.get("x-agentpay-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const openDemoRead = !provided && isPublicDemoEnabled();
  const auth = openDemoRead ? null : await assertIntegratorApiKey(request, "evidence:read");
  if (auth && !auth.ok) return auth.response;
  if (openDemoRead) {
    const denied = await assertPublicDemoAccess(request, "evidence_read");
    if (denied) return denied;
  }

  try {
    const { id } = await context.params;
    if (auth && "keyId" in auth && auth.keyId) await recordApiKeyUsage(auth.keyId, request);
    if (!hasDatabase()) {
      await ensureMemoryShowcaseData();
      try {
        return NextResponse.json(exportMemoryEvidencePack(id));
      } catch {
        const fallbackId = listMemoryEvents({ limit: 20 })
          .find((event) => event.phase === "decision" && (event.payment_request as { id?: string } | undefined)?.id)
          ?.payment_request as { id?: string } | undefined;
        if (!fallbackId?.id) throw new Error("not_found");
        const pack = exportMemoryEvidencePack(fallbackId.id) as Record<string, unknown>;
        return NextResponse.json({
          ...pack,
          requested_payment_request_id: id,
          lookup_note:
            "The public Vercel fallback is using per-function memory, so this response returns the current warm demo evidence pack."
        });
      }
    }
    const pack = await exportEvidencePack(id);
    return NextResponse.json(pack);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "not_found" },
      { status: 404 }
    );
  }
}
