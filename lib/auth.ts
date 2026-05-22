import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPrisma } from "./prisma";

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function assertAdmin(request: Request) {
  const expected = process.env.ADMIN_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json(
      { error: "admin_not_configured", message: "Set ADMIN_TOKEN in environment." },
      { status: 503 }
    );
  }

  const header =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-admin-token");

  if (!header || header !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}

export async function assertIntegratorApiKey(request: Request) {
  const requireKey = process.env.REQUIRE_DEMO_API_KEY === "true";
  const provided =
    request.headers.get("x-agentpay-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const envFallback = process.env.DEMO_INTEGRATOR_API_KEY?.trim();
  if (!provided && envFallback) {
    return { ok: true as const, label: "env_demo_key", keyId: undefined };
  }

  if (!provided) {
    if (requireKey) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            error: "api_key_required",
            message: "Send x-agentpay-api-key. Create keys in /admin (backstage)."
          },
          { status: 401 }
        )
      };
    }
    return { ok: true as const, label: "open_demo", keyId: undefined };
  }

  const prisma = getPrisma();
  const hash = hashApiKey(provided);
  const row = await prisma.kyaApiKey.findFirst({
    where: { keyHash: hash, revokedAt: null }
  });

  if (!row) {
    if (envFallback && safeEqual(provided, envFallback)) {
      return { ok: true as const, label: "env_demo_key", keyId: undefined };
    }
    return {
      ok: false as const,
      response: NextResponse.json({ error: "invalid_api_key" }, { status: 401 })
    };
  }

  return { ok: true as const, label: row.label, keyId: row.id as string };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
