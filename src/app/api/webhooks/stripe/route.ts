/**
 * Stripe webhook handler.
 * Handles both vendor-facing events (payment_intent) and
 * platform events (subscription changes for vendor billing).
 */

import { NextRequest, NextResponse } from "next/server";
import { constructPlatformWebhookEvent } from "@/lib/stripe/client";
import { prisma } from "@/lib/db/client";
import { PaymentStatus, InvoiceStatus, SubscriptionStatus, Tier } from "@prisma/client";
import Stripe from "stripe";
import { createQboPayment } from "@/lib/qbo/invoices";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructPlatformWebhookEvent(body, signature);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  // Connect events have event.account set to the connected Stripe account ID.
  // Look up the vendor so payment events can be attributed correctly.
  const connectedAccountId = (event as Stripe.Event & { account?: string }).account;

  try {
    switch (event.type) {
      // ── Payment events (vendor's customer pays an invoice) ────────────────
      // These arrive as Connect events (event.account = vendor's Stripe acct).
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        // Prefer vendorId from metadata; fall back to looking up by Stripe account.
        let { invoiceId, vendorId, customerId } = intent.metadata;

        if (!vendorId && connectedAccountId) {
          const connection = await prisma.stripeConnection.findFirst({
            where: { stripeAccountId: connectedAccountId },
            select: { vendorId: true },
          });
          vendorId = connection?.vendorId ?? "";
        }
        if (!invoiceId || !vendorId) break;

        await prisma.$transaction(async (tx) => {
          // Update or create payment record
          const payment = await tx.payment.upsert({
            where: { stripePaymentIntentId: intent.id },
            update: {
              status: PaymentStatus.SUCCEEDED,
              stripeUpdatedAt: new Date(),
            },
            create: {
              vendorId,
              invoiceId,
              customerId,
              stripePaymentIntentId: intent.id,
              amount: intent.amount,
              currency: intent.currency,
              status: PaymentStatus.SUCCEEDED,
              stripeUpdatedAt: new Date(),
            },
          });

          // Update invoice balance
          const invoice = await tx.invoice.findUniqueOrThrow({
            where: { id: invoiceId },
          });

          const newAmountPaid = invoice.amountPaid + intent.amount;
          const newAmountDue = Math.max(0, invoice.amountTotal - newAmountPaid);
          const newStatus: InvoiceStatus =
            newAmountDue <= 0
              ? InvoiceStatus.PAID
              : InvoiceStatus.PARTIAL;

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              amountPaid: newAmountPaid,
              amountDue: newAmountDue,
              status: newStatus,
              stripeUpdatedAt: new Date(),
            },
          });

          return payment;
        });

        // Sync payment to QBO (best-effort, non-blocking)
        void syncPaymentToQbo(vendorId, invoiceId, customerId, intent);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: intent.id },
          data: { status: PaymentStatus.FAILED, stripeUpdatedAt: new Date() },
        });
        break;
      }

      // ── Vendor subscription events (they pay us) ──────────────────────────
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const vendorId = sub.metadata?.vendorId;
        if (!vendorId) break;

        const statusMap: Record<string, SubscriptionStatus> = {
          active: SubscriptionStatus.ACTIVE,
          trialing: SubscriptionStatus.TRIALING,
          past_due: SubscriptionStatus.PAST_DUE,
          canceled: SubscriptionStatus.CANCELED,
          unpaid: SubscriptionStatus.PAST_DUE,
        };

        await prisma.vendor.update({
          where: { id: vendorId },
          data: {
            platformSubscriptionId: sub.id,
            subscriptionStatus: statusMap[sub.status] ?? SubscriptionStatus.ACTIVE,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const vendorId = sub.metadata?.vendorId;
        if (!vendorId) break;
        await prisma.vendor.update({
          where: { id: vendorId },
          data: { subscriptionStatus: SubscriptionStatus.CANCELED },
        });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { vendorId, tier } = session.metadata ?? {};
        if (!vendorId || !tier) break;
        await prisma.vendor.update({
          where: { id: vendorId },
          data: { subscriptionTier: tier as Tier },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function syncPaymentToQbo(
  vendorId: string,
  invoiceId: string,
  customerId: string,
  intent: Stripe.PaymentIntent
): Promise<void> {
  try {
    const [invoice, customer] = await Promise.all([
      prisma.invoice.findUnique({ where: { id: invoiceId } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
    ]);

    if (!invoice?.qboInvoiceId || !customer?.qboCustomerId) return;

    const txnDate = new Date().toISOString().split("T")[0];
    const qboPayment = await createQboPayment(
      vendorId,
      customer.qboCustomerId,
      invoice.qboInvoiceId,
      intent.amount,
      txnDate
    );

    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: intent.id },
      data: {
        qboPaymentId: qboPayment.Id,
        qboUpdatedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to sync payment to QBO:", err);
  }
}
