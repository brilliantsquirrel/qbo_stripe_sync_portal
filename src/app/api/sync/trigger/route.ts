import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { syncVendor } from "@/lib/sync/engine";
import { SyncTrigger } from "@prisma/client";

export async function POST(_req: NextRequest) {
  const vendor = await requireVendor();

  try {
    // In development, run the sync inline — Cloud Tasks isn't available locally.
    if (process.env.NODE_ENV === "development") {
      const result = await syncVendor(vendor.id, SyncTrigger.MANUAL);
      return NextResponse.json({ success: true, ...result });
    }

    // In production, enqueue via Cloud Tasks (dynamic import keeps it out of the dev bundle).
    const { enqueueImmediateSync } = await import("@/lib/sync/scheduler");
    await enqueueImmediateSync(vendor.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
