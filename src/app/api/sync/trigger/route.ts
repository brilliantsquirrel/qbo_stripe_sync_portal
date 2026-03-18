import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { syncVendor } from "@/lib/sync/engine";
import { SyncTrigger } from "@prisma/client";

export async function POST(_req: NextRequest) {
  const vendor = await requireVendor();

  // Prevent concurrent syncs
  const running = await prisma.syncLog.findFirst({
    where: { vendorId: vendor.id, status: "RUNNING" },
  });
  if (running) {
    return NextResponse.json({ error: "A sync is already running" }, { status: 409 });
  }

  try {
    // In development, run the sync inline — Cloud Tasks isn't available locally.
    if (process.env.NODE_ENV === "development") {
      const result = await syncVendor(vendor.id, SyncTrigger.MANUAL);
      return NextResponse.json({ success: true, ...result });
    }

    // In production, enqueue via Cloud Tasks (dynamic import keeps it out of the dev bundle).
    const { enqueueImmediateSync } = await import("@/lib/sync/scheduler");
    await enqueueImmediateSync(vendor.id);
    return NextResponse.json({ success: true, queued: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
