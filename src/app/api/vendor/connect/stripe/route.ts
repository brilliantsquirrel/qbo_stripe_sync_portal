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
  const vendor = await requireVendor();
  const body = await req.json();
  const { secretKey, webhookSecret } = schema.parse(body);

  // Validate key by fetching account info
  const stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  const account = await stripe.accounts.retrieve();

  await prisma.stripeConnection.upsert({
    where: { vendorId: vendor.id },
    update: {
      secretKey: encrypt(secretKey),
      publishableKey: `pk_${secretKey.split("_").slice(1).join("_").replace(/^s_/, "p_")}`,
      webhookSecret: encrypt(webhookSecret),
    },
    create: {
      vendorId: vendor.id,
      stripeAccountId: account.id,
      secretKey: encrypt(secretKey),
      publishableKey: `pk_${secretKey.split("_").slice(1).join("_").replace(/^s_/, "p_")}`,
      webhookSecret: encrypt(webhookSecret),
    },
  });

  return NextResponse.json({ success: true, accountId: account.id });
}
