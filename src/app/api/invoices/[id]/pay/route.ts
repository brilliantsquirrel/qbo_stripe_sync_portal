import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCustomer } from "@/lib/auth/session";
import { createPaymentIntent } from "@/lib/stripe/payments";
import { prisma } from "@/lib/db/client";

const schema = z.object({
  amountCents: z.number().int().positive(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await requireCustomer();
  const { id: invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, customerId: customer.id, vendorId: customer.vendorId },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "PAID" || invoice.status === "VOID") {
    return NextResponse.json({ error: "Invoice is already paid or void" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { amountCents } = schema.parse(body);

    // Cannot pay more than what's due
    if (amountCents > invoice.amountDue) {
      return NextResponse.json(
        { error: "Amount exceeds invoice balance" },
        { status: 400 }
      );
    }

    const result = await createPaymentIntent(
      customer.vendorId,
      invoiceId,
      customer.id,
      amountCents,
      invoice.currency
    );

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        vendorId: customer.vendorId,
        invoiceId,
        customerId: customer.id,
        stripePaymentIntentId: result.paymentIntentId,
        amount: amountCents,
        currency: invoice.currency,
        status: "PENDING",
      },
    });

    return NextResponse.json({ clientSecret: result.clientSecret });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
