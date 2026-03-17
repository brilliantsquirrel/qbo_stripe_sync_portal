import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { createOAuthClient, saveQboConnection } from "@/lib/qbo/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(req: NextRequest) {
  const vendor = await requireVendor();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");

  if (!code || !realmId) {
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=qbo_cancelled`
    );
  }

  try {
    const oauthClient = createOAuthClient();
    await oauthClient.createToken(req.url);
    const token = oauthClient.getToken();

    await saveQboConnection(
      vendor.id,
      realmId,
      token.access_token,
      token.refresh_token,
      token.expires_in
    );

    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?success=qbo_connected`
    );
  } catch (err) {
    console.error("QBO OAuth callback error:", err);
    return NextResponse.redirect(
      `${APP_URL}/vendor/settings/connections?error=qbo_failed`
    );
  }
}
