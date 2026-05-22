import { NextResponse } from "next/server";
import { getClientIp } from "./http";
import { checkRateLimit } from "./rate-limit";

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isPublicDemoEnabled() {
  return !isProduction() || process.env.PUBLIC_DEMO_MODE === "true";
}

export async function assertPublicDemoAccess(request: Request, action = "demo") {
  if (!isPublicDemoEnabled()) {
    return NextResponse.json(
      {
        error: "public_demo_disabled",
        message: "Set PUBLIC_DEMO_MODE=true to enable public sandbox demo actions in production."
      },
      { status: 403 }
    );
  }

  const ip = getClientIp(request);
  const limit = await checkRateLimit({
    namespace: `public_demo:${action}`,
    key: ip,
    limit: Number(process.env.PUBLIC_DEMO_RATE_LIMIT_PER_MINUTE ?? 30)
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited", reset_at: limit.resetAt },
      { status: 429 }
    );
  }

  return null;
}
