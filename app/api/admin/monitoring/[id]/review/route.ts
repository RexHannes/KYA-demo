import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const prisma = getPrisma();

  const alert = await prisma.kyaMonitoringAlert.findUnique({ where: { id } });
  if (!alert) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let reviewedBy = "operator";
  try {
    const body = await request.json().catch(() => ({}));
    if (body.reviewed_by && typeof body.reviewed_by === "string") {
      reviewedBy = body.reviewed_by;
    }
  } catch {
    // no body is fine
  }

  const updated = await prisma.kyaMonitoringAlert.update({
    where: { id },
    data: { reviewedAt: new Date(), reviewedBy }
  });

  return NextResponse.json({ alert: updated });
}
