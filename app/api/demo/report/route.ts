import { NextResponse } from "next/server";
import { buildEvidenceReport } from "@/lib/demo-report";

export async function GET() {
  return NextResponse.json(await buildEvidenceReport());
}
