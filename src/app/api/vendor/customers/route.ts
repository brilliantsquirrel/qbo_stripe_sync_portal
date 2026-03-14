import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const vendor = await requireVendor();

  const customers = await prisma.customer.findMany({
    where: { vendorId: vendor.id },
    include: {
      _count: {
        select: { invoices: true, payments: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ customers });
}
