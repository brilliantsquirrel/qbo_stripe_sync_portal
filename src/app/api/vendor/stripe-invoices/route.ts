import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { getVendorStripe } from "@/lib/stripe/client";

/**
 * DELETE /api/vendor/stripe-invoices
 * Deletes all draft invoices and voids all open (unpaid) invoices
 * on the vendor's connected Stripe account.
 */
export async function DELETE() {
  const vendor = await requireVendor();

  const stripe = await getVendorStripe(vendor.id);

  let deleted = 0;
  let voided = 0;

  // Process draft invoices — these can be permanently deleted
  for await (const invoice of stripe.invoices.list({ status: "draft" })) {
    await stripe.invoices.del(invoice.id);
    deleted++;
  }

  // Process open invoices — must be voided (Stripe doesn't allow deletion)
  for await (const invoice of stripe.invoices.list({ status: "open" })) {
    await stripe.invoices.voidInvoice(invoice.id);
    voided++;
  }

  return NextResponse.json({ success: true, deleted, voided });
}
