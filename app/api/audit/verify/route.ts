import { NextResponse } from "next/server";
import { verifyAuditChain } from "@/lib/vendor/agentpay/core/audit.js";

export async function POST(request: Request) {
  const body = await request.json();
  const events = body.events ?? [];
  const verification = verifyAuditChain(events);
  return NextResponse.json(verification);
}
