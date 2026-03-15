import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { encrypt } from "@/lib/utils/crypto";
import Stripe from "stripe";

const schema = z.object({
  secretKey: z.string().startsWith("sk_"),
  webhookSecret: z.string().startsWith("whsec_"),
});

export async function POST(req: NextRequest) {
  try {
    const vendor = await requireVendor();
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { secretKey, webhookSecret } = parsed.data;

    // Validate the key using balance (works with any restricted key)
    const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });
    let accountId: string;
    try {
      // balance.retrieve works with restricted keys; grab account id from a separate call
      await stripe.balance.retrieve();
      // Try to get the account id — may fail if key is restricted; fall back to a placeholder
      try {
        const account = await stripe.accounts.retrieve();
        accountId = account.id;
      } catch {
        // Restricted key: derive a stable placeholder from the key prefix
        accountId = `acct_restricted_${secretKey.slice(-8)}`;
      }
    } catch (stripeErr: unknown) {
      const msg =
        stripeErr instanceof Stripe.errors.StripeError
          ? stripeErr.message
          : "Invalid Stripe secret key";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Derive publishable key from secret key  (sk_live_xxx → pk_live_xxx)
    const publishableKey = secretKey.replace(/^sk_/, "pk_");

    await prisma.stripeConnection.upsert({
      where: { vendorId: vendor.id },
      update: {
        secretKey: encrypt(secretKey),
        publishableKey,
        webhookSecret: encrypt(webhookSecret),
      },
      create: {
        vendorId: vendor.id,
        stripeAccountId: accountId,
        secretKey: encrypt(secretKey),
        publishableKey,
        webhookSecret: encrypt(webhookSecret),
      },
    });

    return NextResponse.json({ success: true, accountId });
  } catch (err: unknown) {
    console.error("[stripe-connect] unexpected error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
