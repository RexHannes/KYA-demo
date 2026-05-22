import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getPrisma, hasDatabase } from "./prisma";
import { isProduction } from "./demo-access";
import { getClientIp } from "./http";
import { checkRateLimit } from "./rate-limit";

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export const DEFAULT_API_KEY_SCOPES = ["payment:check", "payment:execute_mock", "evidence:read"];

function normalizeScopes(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : DEFAULT_API_KEY_SCOPES;
}

export async function assertAdmin(request: Request) {
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
    const limited = await checkRateLimit({
      namespace: "admin_auth",
      key: getClientIp(request),
      limit: Number(process.env.ADMIN_RATE_LIMIT_PER_MINUTE ?? 10)
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "rate_limited", reset_at: limited.resetAt },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}

export async function assertIntegratorApiKey(request: Request, requiredScope: string) {
  const requireKey = isProduction() || process.env.REQUIRE_DEMO_API_KEY === "true";
  const provided =
    request.headers.get("x-agentpay-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

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
    const limited = await checkRateLimit({
      namespace: "integrator_open_demo",
      key: getClientIp(request),
      limit: Number(process.env.OPEN_DEMO_RATE_LIMIT_PER_MINUTE ?? 30)
    });
    if (!limited.allowed) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "rate_limited", reset_at: limited.resetAt },
          { status: 429 }
        )
      };
    }
    return { ok: true as const, label: "open_demo", keyId: undefined };
  }

  const envFallback = process.env.DEMO_INTEGRATOR_API_KEY?.trim();
  if (envFallback && safeEqual(provided, envFallback)) {
    const limited = await checkRateLimit({
      namespace: "integrator_env_key",
      key: "env_demo_key",
      limit: Number(process.env.ENV_DEMO_KEY_RATE_LIMIT_PER_MINUTE ?? 60)
    });
    if (!limited.allowed) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "rate_limited", reset_at: limited.resetAt },
          { status: 429 }
        )
      };
    }
    return { ok: true as const, label: "env_demo_key", keyId: undefined, scopes: DEFAULT_API_KEY_SCOPES };
  }

  if (!hasDatabase()) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "invalid_api_key" }, { status: 401 })
    };
  }

  const prisma = getPrisma();
  const hash = hashApiKey(provided);
  const row = await prisma.kyaApiKey.findFirst({
    where: { keyHash: hash, revokedAt: null }
  });

  if (!row) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "invalid_api_key" }, { status: 401 })
    };
  }

  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "api_key_expired" }, { status: 401 })
    };
  }

  const scopes = normalizeScopes(row.scopes);
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "insufficient_scope", required_scope: requiredScope },
        { status: 403 }
      )
    };
  }

  const limited = await checkRateLimit({
    namespace: "integrator_key",
    key: row.id,
    limit: row.rateLimitPerMinute ?? Number(process.env.API_KEY_RATE_LIMIT_PER_MINUTE ?? 60)
  });
  if (!limited.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "rate_limited", reset_at: limited.resetAt },
        { status: 429 }
      )
    };
  }

  return { ok: true as const, label: row.label, keyId: row.id as string, scopes };
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
