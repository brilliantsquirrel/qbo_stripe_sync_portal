import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getVendorStripe } from "@/lib/stripe/client";

/**
 * Redirect to Stripe's hosted receipt URL for a succeeded payment.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await requireCustomer();
  const { id } = await params;

  const payment = await prisma.payment.findFirst({
    where: { id, customerId: customer.id, vendorId: customer.vendorId, status: "SUCCEEDED" },
  });

  if (!payment?.stripePaymentIntentId) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  try {
    const stripe = await getVendorStripe(customer.vendorId);
    const intent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId, {
      expand: ["latest_charge"],
    });

    const charge = intent.latest_charge as { receipt_url?: string } | null;
    const receiptUrl = charge?.receipt_url;

    if (!receiptUrl) {
      return NextResponse.json({ error: "Receipt URL not available yet" }, { status: 404 });
    }

    return NextResponse.redirect(receiptUrl);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
