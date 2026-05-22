import { NextResponse } from "next/server";

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent") ?? "unknown";
}

export async function readJsonBody(request: Request, { maxBytes = 65_536 } = {}) {
  if (!request.body) return { ok: true as const, data: {} };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "body_too_large", message: `Request body exceeds ${maxBytes} bytes.` },
          { status: 413 }
        )
      };
    }
    chunks.push(value);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return { ok: true as const, data: {} };

  try {
    return { ok: true as const, data: JSON.parse(raw) };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "invalid_json" }, { status: 400 })
    };
  }
}
