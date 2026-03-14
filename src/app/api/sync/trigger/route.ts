import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { enqueueImmediateSync } from "@/lib/sync/scheduler";

export async function POST(req: NextRequest) {
  const vendor = await requireVendor();

  try {
    await enqueueImmediateSync(vendor.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
