import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const vendor = await requireVendor();

  const logs = await prisma.syncLog.findMany({
    where: { vendorId: vendor.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
