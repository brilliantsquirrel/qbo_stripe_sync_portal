import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getPlatformStripe } from "@/lib/stripe/client";

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${APP_URL}/api/vendor/connect/stripe/callback`;

/**
 * GET — redirect vendor to Stripe Connect OAuth authorization page.
 */
export async function GET() {
  const vendor = await requireVendor();

  // Encode vendorId as state for CSRF verification in the callback
  const state = Buffer.from(vendor.id).toString("base64url");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: STRIPE_CLIENT_ID,
    scope: "read_write",
    redirect_uri: REDIRECT_URI,
    state,
  });

  return NextResponse.redirect(
    `https://connect.stripe.com/oauth/authorize?${params}`
  );
}

/**
 * DELETE — deauthorize the vendor's connected Stripe account and remove the record.
 */
export async function DELETE() {
  const vendor = await requireVendor();

  const connection = await prisma.stripeConnection.findUnique({
    where: { vendorId: vendor.id },
  });

  if (!connection) {
    return NextResponse.json({ error: "No Stripe connection found" }, { status: 404 });
  }

  try {
    await getPlatformStripe().oauth.deauthorize({
      client_id: STRIPE_CLIENT_ID,
      stripe_user_id: connection.stripeAccountId,
    });
  } catch (err) {
    // Log but don't block — connection may already be deauthorized on Stripe's side
    console.warn("[stripe-disconnect] deauthorize failed:", err);
  }

  await prisma.stripeConnection.delete({ where: { vendorId: vendor.id } });

  return NextResponse.json({ success: true });
}
