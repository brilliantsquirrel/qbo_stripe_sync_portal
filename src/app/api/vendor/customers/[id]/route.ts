/**
 * PATCH /api/vendor/customers/[id]
 * Update vendor-editable fields on a customer.
 * Currently: allowedEmails (comma-separated login email list).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  allowedEmails: z.string().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await requireVendor();
  const { id: customerId } = await params;

  // Verify the customer belongs to this vendor
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, vendorId: vendor.id },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const { allowedEmails } = schema.parse(body);

    // Normalise: trim each address, de-dupe, drop empties
    const normalised = allowedEmails
      ? allowedEmails
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
          .filter((e, i, arr) => arr.indexOf(e) === i)
          .join(", ") || null
      : null;

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { allowedEmails: normalised },
    });

    return NextResponse.json({ allowedEmails: updated.allowedEmails });
  } catch (err) {
    console.error("[PATCH /api/vendor/customers/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    );
  }
}
