import Stripe from "stripe";
import { getVendorStripe } from "@/lib/stripe/client";
import { prisma } from "@/lib/db/client";

/**
 * Create a Stripe PaymentIntent for an invoice payment (full or partial).
 */
export async function createPaymentIntent(
  vendorId: string,
  invoiceId: string,
  customerId: string,
  amountCents: number,
  currency: string = "usd"
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = await getVendorStripe(vendorId);

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customer.stripeCustomerId ?? undefined,
    payment_method_types: ["card", "us_bank_account"],
    setup_future_usage: "off_session", // allow saving the card
    metadata: {
      vendorId,
      invoiceId,
      customerId,
    },
  });

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
  };
}

/**
 * Create a SetupIntent so a customer can save a payment method without charging.
 */
export async function createSetupIntent(
  vendorId: string,
  customerId: string
): Promise<{ clientSecret: string }> {
  const stripe = await getVendorStripe(vendorId);

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  const intent = await stripe.setupIntents.create({
    customer: customer.stripeCustomerId ?? undefined,
    payment_method_types: ["card", "us_bank_account"],
    metadata: { vendorId, customerId },
  });

  return { clientSecret: intent.client_secret! };
}

/**
 * List saved payment methods for a customer.
 */
export async function listPaymentMethods(
  vendorId: string,
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripe = await getVendorStripe(vendorId);

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  if (!customer.stripeCustomerId) return [];

  const methods = await stripe.paymentMethods.list({
    customer: customer.stripeCustomerId,
    type: "card",
  });

  return methods.data;
}

/**
 * Detach a payment method from a customer.
 */
export async function detachPaymentMethod(
  vendorId: string,
  paymentMethodId: string
): Promise<void> {
  const stripe = await getVendorStripe(vendorId);
  await stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Charge a customer using their saved payment method (for auto-pay).
 */
export async function chargeWithSavedMethod(
  vendorId: string,
  invoiceId: string,
  customerId: string,
  paymentMethodId: string,
  amountCents: number,
  currency: string = "usd"
): Promise<Stripe.PaymentIntent> {
  const stripe = await getVendorStripe(vendorId);

  const customer = await prisma.customer.findUniqueOrThrow({
    where: { id: customerId },
  });

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    customer: customer.stripeCustomerId!,
    payment_method: paymentMethodId,
    off_session: true,
    confirm: true,
    metadata: { vendorId, invoiceId, customerId, autoPayTriggered: "true" },
  });

  return intent;
}
