import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { createIntegratorApiKey, listIntegratorApiKeys, revokeIntegratorApiKey } from "@/lib/api-keys";

export async function GET(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;
  const keys = await listIntegratorApiKeys();
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label : "integrator";
  const created = await createIntegratorApiKey(label);
  return NextResponse.json(
    {
      ...created,
      note: "Copy the key now. It cannot be retrieved again."
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const denied = assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  await revokeIntegratorApiKey(id);
  return NextResponse.json({ revoked: true, id });
}
