/**
 * Vendor platform billing — manages vendor Stripe subscriptions (they pay us).
 * Uses platformStripe (our Stripe account), NOT the vendor's own Stripe.
 */

import { platformStripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/db/client";
import { Tier } from "@prisma/client";

// Map our tiers to Stripe Price IDs (set these in env or a config file)
const TIER_PRICE_IDS: Record<Tier, string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER!,
  GROWTH: process.env.STRIPE_PRICE_GROWTH!,
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
};

/**
 * Create or retrieve a Stripe customer for a vendor on our platform.
 */
export async function getOrCreatePlatformCustomer(
  vendorId: string
): Promise<string> {
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });

  if (vendor.platformStripeCustomerId) {
    return vendor.platformStripeCustomerId;
  }

  const customer = await platformStripe.customers.create({
    email: vendor.email,
    name: vendor.name,
    metadata: { vendorId },
  });

  await prisma.vendor.update({
    where: { id: vendorId },
    data: { platformStripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create a Stripe Checkout Session for a vendor to subscribe to a tier.
 */
export async function createSubscriptionCheckoutSession(
  vendorId: string,
  tier: Tier,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreatePlatformCustomer(vendorId);
  const priceId = TIER_PRICE_IDS[tier];

  const session = await platformStripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?checkout=success`,
    cancel_url: `${returnUrl}?checkout=canceled`,
    metadata: { vendorId, tier },
  });

  return session.url!;
}

/**
 * Create a Stripe Billing Portal session so vendors can manage their subscription.
 */
export async function createBillingPortalSession(
  vendorId: string,
  returnUrl: string
): Promise<string> {
  const customerId = await getOrCreatePlatformCustomer(vendorId);

  const session = await platformStripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Report usage for a vendor at end of billing period.
 */
export async function reportUsage(
  vendorId: string,
  invoicesSynced: number,
  revenueProcessed: number
): Promise<void> {
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (!vendor.platformSubscriptionId) return;

  // Retrieve subscription to get the meter item
  const subscription = await platformStripe.subscriptions.retrieve(
    vendor.platformSubscriptionId
  );

  // Report usage via Stripe Billing Meter Events API (SDK 17+).
  // Requires a Meter named "invoices_synced" created in the Stripe dashboard.
  const hasMetered = subscription.items.data.some(
    (item) => item.price.recurring?.usage_type === "metered"
  );

  if (hasMetered) {
    await platformStripe.billing.meterEvents.create({
      event_name: "invoices_synced",
      payload: {
        stripe_customer_id: vendor.platformStripeCustomerId!,
        value: String(invoicesSynced),
      },
    });
  }
}
