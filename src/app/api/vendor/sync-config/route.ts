import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const SyncConfigSchema = z.object({
  frequencyHours: z.number().int().min(1).max(168), // 1 hour to 1 week
});

export async function GET() {
  const vendor = await requireVendor();
  const config = await prisma.syncConfig.findUnique({
    where: { vendorId: vendor.id },
    select: { frequencyMinutes: true, lastSyncAt: true, nextSyncAt: true },
  });
  return NextResponse.json({
    frequencyHours: config ? Math.round(config.frequencyMinutes / 60) : 1,
    lastSyncAt: config?.lastSyncAt ?? null,
    nextSyncAt: config?.nextSyncAt ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const vendor = await requireVendor();
  const body = await req.json();
  const parsed = SyncConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const frequencyMinutes = parsed.data.frequencyHours * 60;
  const config = await prisma.syncConfig.upsert({
    where: { vendorId: vendor.id },
    create: { vendorId: vendor.id, frequencyMinutes },
    update: { frequencyMinutes },
    select: { frequencyMinutes: true, lastSyncAt: true, nextSyncAt: true },
  });
  return NextResponse.json({
    frequencyHours: Math.round(config.frequencyMinutes / 60),
    lastSyncAt: config.lastSyncAt,
    nextSyncAt: config.nextSyncAt,
  });
}
