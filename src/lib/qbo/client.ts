import OAuthClient from "intuit-oauth";
import QuickBooks from "node-quickbooks";
import { prisma } from "@/lib/db/client";
import { encrypt, decrypt } from "@/lib/utils/crypto";

const QBO_ENV = (process.env.QBO_ENVIRONMENT ?? "sandbox") as
  | "sandbox"
  | "production";

/**
 * Create an Intuit OAuth client (used for the OAuth2 authorization flow).
 */
export function createOAuthClient(): OAuthClient {
  return new OAuthClient({
    clientId: process.env.QBO_CLIENT_ID!,
    clientSecret: process.env.QBO_CLIENT_SECRET!,
    environment: QBO_ENV,
    redirectUri: process.env.QBO_REDIRECT_URI!,
  });
}

/**
 * Get a connected QuickBooks client for a vendor, refreshing the token if needed.
 */
export async function getQboClient(vendorId: string): Promise<QuickBooks> {
  const connection = await prisma.qboConnection.findUnique({
    where: { vendorId },
  });

  if (!connection) {
    throw new Error(`No QBO connection found for vendor ${vendorId}`);
  }

  let accessToken = decrypt(connection.accessToken);
  const refreshToken = decrypt(connection.refreshToken);

  // Refresh token if expired (with 5-minute buffer)
  if (connection.tokenExpiresAt <= new Date(Date.now() + 5 * 60 * 1000)) {
    const oauthClient = createOAuthClient();
    oauthClient.setToken({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400,
      realmId: connection.realmId,
    });

    const authResponse = await oauthClient.refresh();
    const newToken = authResponse.getJson();

    accessToken = newToken.access_token;
    const newExpiresAt = new Date(Date.now() + newToken.expires_in * 1000);

    await prisma.qboConnection.update({
      where: { vendorId },
      data: {
        accessToken: encrypt(newToken.access_token),
        refreshToken: encrypt(newToken.refresh_token),
        tokenExpiresAt: newExpiresAt,
      },
    });
  }

  return new QuickBooks(
    process.env.QBO_CLIENT_ID!,
    process.env.QBO_CLIENT_SECRET!,
    accessToken,
    false, // no token secret
    connection.realmId,
    QBO_ENV === "sandbox",
    false, // debug
    null, // minor version
    "2.0", // oauth version
    refreshToken
  );
}

/**
 * Save a new QBO connection for a vendor after OAuth callback.
 */
export async function saveQboConnection(
  vendorId: string,
  realmId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.qboConnection.upsert({
    where: { vendorId },
    update: {
      realmId,
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      tokenExpiresAt: expiresAt,
    },
    create: {
      vendorId,
      realmId,
      accessToken: encrypt(accessToken),
      refreshToken: encrypt(refreshToken),
      tokenExpiresAt: expiresAt,
    },
  });
}
