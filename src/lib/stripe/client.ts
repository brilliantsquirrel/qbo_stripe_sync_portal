import Stripe from "stripe";
import { prisma } from "@/lib/db/client";
import { decrypt } from "@/lib/utils/crypto";

// Platform-level Stripe client (for vendor billing / subscriptions to US)
export const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

/**
 * Get a Stripe client scoped to a vendor's own Stripe account.
 * Uses the vendor's decrypted secret key.
 */
export async function getVendorStripe(vendorId: string): Promise<Stripe> {
  const connection = await prisma.stripeConnection.findUnique({
    where: { vendorId },
  });

  if (!connection) {
    throw new Error(`No Stripe connection found for vendor ${vendorId}`);
  }

  const secretKey = decrypt(connection.secretKey);

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
    typescript: true,
  });
}

/**
 * Verify a Stripe webhook signature using the vendor's webhook secret.
 */
export async function constructVendorWebhookEvent(
  body: string,
  signature: string,
  vendorId: string
): Promise<Stripe.Event> {
  const connection = await prisma.stripeConnection.findUnique({
    where: { vendorId },
  });

  if (!connection) {
    throw new Error(`No Stripe connection found for vendor ${vendorId}`);
  }

  const webhookSecret = decrypt(connection.webhookSecret);
  const stripe = await getVendorStripe(vendorId);
  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

/**
 * Verify a platform-level Stripe webhook (for vendor subscription events).
 */
export function constructPlatformWebhookEvent(
  body: string,
  signature: string
): Stripe.Event {
  return platformStripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
