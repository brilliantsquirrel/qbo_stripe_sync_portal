import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const vendor = await requireVendor();

  const [qboConnection, stripeConnection, syncConfig] = await Promise.all([
    prisma.qboConnection.findUnique({
      where: { vendorId: vendor.id },
      select: { id: true, realmId: true, tokenExpiresAt: true },
    }),
    prisma.stripeConnection.findUnique({
      where: { vendorId: vendor.id },
      select: { id: true, stripeAccountId: true },
    }),
    prisma.syncConfig.findUnique({
      where: { vendorId: vendor.id },
      select: { frequencyMinutes: true, lastSyncAt: true, nextSyncAt: true },
    }),
  ]);

  return NextResponse.json({
    qboConnected: !!qboConnection,
    qboRealmId: qboConnection?.realmId,
    stripeConnected: !!stripeConnection,
    stripeAccountId: stripeConnection?.stripeAccountId,
    syncConfig,
  });
}
