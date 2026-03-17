import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { getPlatformStripe } from "@/lib/stripe/client";
import { encrypt } from "@/lib/utils/crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  // User declined on Stripe's side
  if (errorParam) {
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=stripe_denied`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=stripe_invalid`
    );
  }

  let vendor: Awaited<ReturnType<typeof requireVendor>>;
  try {
    vendor = await requireVendor();
  } catch {
    return NextResponse.redirect(`${APP_URL}/vendor/login`);
  }

  // Verify state matches the initiating vendor (CSRF check)
  const expectedState = Buffer.from(vendor.id).toString("base64url");
  if (state !== expectedState) {
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=stripe_invalid`
    );
  }

  try {
    const token = await getPlatformStripe().oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const {
      access_token,
      stripe_user_id,
      stripe_publishable_key,
      scope,
    } = token as {
      access_token: string;
      stripe_user_id: string;
      stripe_publishable_key: string;
      scope: string;
    };

    await prisma.stripeConnection.upsert({
      where: { vendorId: vendor.id },
      update: {
        stripeAccountId: stripe_user_id,
        accessToken: encrypt(access_token),
        publishableKey: stripe_publishable_key,
        scope: scope ?? "read_write",
      },
      create: {
        vendorId: vendor.id,
        stripeAccountId: stripe_user_id,
        accessToken: encrypt(access_token),
        publishableKey: stripe_publishable_key,
        scope: scope ?? "read_write",
      },
    });

    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?success=stripe_connected`
    );
  } catch (err) {
    console.error("[stripe-callback] token exchange failed:", err);
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=stripe_failed`
    );
  }
}
