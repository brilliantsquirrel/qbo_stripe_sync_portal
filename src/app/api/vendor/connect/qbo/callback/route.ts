import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { createOAuthClient, saveQboConnection } from "@/lib/qbo/client";

export async function GET(req: NextRequest) {
  const vendor = await requireVendor();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const realmId = searchParams.get("realmId");

  if (!code || !realmId) {
    return NextResponse.redirect(
      new URL("/vendor/settings/connections?error=qbo_cancelled", req.url)
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
      new URL("/vendor/settings/connections?success=qbo_connected", req.url)
    );
  } catch (err) {
    console.error("QBO OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/vendor/settings/connections?error=qbo_failed", req.url)
    );
  }
}
