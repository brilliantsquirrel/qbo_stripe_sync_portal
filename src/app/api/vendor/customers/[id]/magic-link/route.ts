/**
 * POST /api/vendor/customers/[id]/magic-link
 * Vendor-only: send a magic link OTP to one of the customer's allowed emails.
 * Body: { email: string }  — must be the primary email or in allowedEmails.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { sendMagicLinkById } from "@/lib/auth/magic-link";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await requireVendor();
  const { id: customerId } = await params;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, vendorId: vendor.id },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  try {
    const { email } = schema.parse(await req.json());

    // Verify the requested email is authorised for this customer
    const allEmails = [
      customer.email,
      ...(customer.allowedEmails?.split(",").map((e) => e.trim()) ?? []),
    ].map((e) => e.toLowerCase());

    if (!allEmails.includes(email.toLowerCase())) {
      return NextResponse.json(
        { error: "Email is not associated with this customer" },
        { status: 400 }
      );
    }

    // Use the by-ID variant — customer is already verified, no re-lookup needed
    await sendMagicLinkById(customerId, email);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/vendor/customers/[id]/magic-link]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send" },
      { status: 500 }
    );
  }
}
