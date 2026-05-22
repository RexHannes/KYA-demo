import { NextResponse } from "next/server";
import { withGuard } from "@/lib/guard-runtime";
import { seedDemoWorld, getDemoWorld } from "@/lib/demo-world";
import { getPrisma, hasDatabase } from "@/lib/prisma";
import { getMemoryWorld, seedMemoryWorld } from "@/lib/memory-runtime";
import { assertPublicDemoAccess } from "@/lib/demo-access";

export async function POST(request: Request) {
  const denied = await assertPublicDemoAccess(request, "seed");
  if (denied) return denied;

  try {
    if (!hasDatabase()) {
      const world = seedMemoryWorld();
      return NextResponse.json({ seeded: true, fallback: "memory", ...world }, { status: 201 });
    }

    const world = await withGuard(async (guard, _store, prisma) => {
      const existing = await getDemoWorld(prisma);
      if (existing?.agents?.length) return existing;
      return seedDemoWorld(guard, prisma);
    });
    return NextResponse.json({ seeded: true, ...world }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "seed_failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const denied = await assertPublicDemoAccess(request, "seed_status");
  if (denied) return denied;

  try {
    if (!hasDatabase()) {
      const world = getMemoryWorld();
      return NextResponse.json({ seeded: Boolean(world), fallback: "memory", ...(world ?? { agents: [] }) });
    }

    const prisma = getPrisma();
    const world = await getDemoWorld(prisma);
    return NextResponse.json({ seeded: Boolean(world), ...(world ?? { agents: [] }) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "read_failed" },
      { status: 500 }
    );
  }
}
