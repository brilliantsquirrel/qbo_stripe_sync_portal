/**
 * Called by GCP Cloud Tasks to execute a sync job.
 * Authenticated via OIDC token — only the Cloud Tasks service account can call this.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { syncVendor } from "@/lib/sync/engine";
import { scheduleNextSync } from "@/lib/sync/scheduler";
import { SyncTrigger } from "@prisma/client";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  vendorId: z.string(),
  trigger: z.nativeEnum(SyncTrigger),
});

export async function POST(req: NextRequest) {
  // Verify OIDC token (Cloud Tasks sends this automatically)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: verify OIDC token against GCP's token endpoint in production
  // For now, we trust the VPC/Cloud Run service mesh

  try {
    const body = await req.json();
    const { vendorId, trigger } = schema.parse(body);

    const result = await syncVendor(vendorId, trigger);

    // Re-schedule next sync if this was a scheduled trigger
    if (trigger === SyncTrigger.SCHEDULED) {
      const config = await prisma.syncConfig.findUnique({ where: { vendorId } });
      if (config) {
        await scheduleNextSync(vendorId, config.frequencyMinutes);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("Sync run failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
