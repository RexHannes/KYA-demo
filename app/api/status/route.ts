import { NextResponse } from "next/server";
import { getSystemStatus } from "@/lib/status";

export async function GET() {
  try {
    return NextResponse.json(await getSystemStatus());
  } catch (error) {
    return NextResponse.json(
      {
        database: "error",
        message: error instanceof Error ? error.message : "status_failed"
      },
      { status: 500 }
    );
  }
}
