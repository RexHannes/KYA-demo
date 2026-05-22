import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth";
import { createIntegratorApiKey, listIntegratorApiKeys, revokeIntegratorApiKey } from "@/lib/api-keys";
import { readJsonBody } from "@/lib/http";
import { appendOperationalAuditEvent } from "@/lib/operational-audit";

export async function GET(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;
  const keys = await listIntegratorApiKeys();
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data as Record<string, unknown>;
  const label = typeof body.label === "string" ? body.label : "integrator";
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((scope): scope is string => typeof scope === "string" && scope.length > 0)
    : undefined;
  const expiresAt = typeof body.expires_at === "string" && body.expires_at
    ? new Date(body.expires_at)
    : null;
  const parsedRateLimit = Number(body.rate_limit_per_minute);
  const rateLimitPerMinute = Number.isFinite(parsedRateLimit) && parsedRateLimit > 0
    ? parsedRateLimit
    : null;

  const created = await createIntegratorApiKey({
    label,
    scopes,
    expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
    rateLimitPerMinute
  });
  await appendOperationalAuditEvent({
    type: "API_KEY_CREATED",
    actor: "admin",
    subjectId: created.id,
    input: { label, scopes: created.scopes, expires_at: created.expiresAt },
    output: { key_id: created.id, key_prefix: created.keyPrefix }
  });
  return NextResponse.json(
    {
      ...created,
      note: "Copy the key now. It cannot be retrieved again."
    },
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });

  await revokeIntegratorApiKey(id);
  await appendOperationalAuditEvent({
    type: "API_KEY_REVOKED",
    actor: "admin",
    subjectId: id,
    input: { id },
    output: { revoked: true, id }
  });
  return NextResponse.json({ revoked: true, id });
}
