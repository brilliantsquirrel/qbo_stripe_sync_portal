import Stripe from "stripe";
import { prisma } from "@/lib/db/client";
import { decrypt } from "@/lib/utils/crypto";

// Platform-level Stripe client — lazy singleton so builds succeed without env vars
let _platformStripe: Stripe | null = null;
export function getPlatformStripe(): Stripe {
  if (!_platformStripe) {
    _platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _platformStripe;
}

/**
 * Get a Stripe client scoped to a vendor's connected Stripe account.
 * Uses the vendor's decrypted OAuth access token.
 */
export async function getVendorStripe(vendorId: string): Promise<Stripe> {
  const connection = await prisma.stripeConnection.findUnique({
    where: { vendorId },
  });

  if (!connection) {
    throw new Error(`No Stripe connection found for vendor ${vendorId}`);
  }

  const accessToken = decrypt(connection.accessToken);

  return new Stripe(accessToken, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
}

/**
 * Verify a platform-level Stripe webhook (for vendor subscription events and
 * Connect events — both use the platform webhook signing secret).
 */
export function constructPlatformWebhookEvent(
  body: string,
  signature: string
): Stripe.Event {
  return getPlatformStripe().webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
