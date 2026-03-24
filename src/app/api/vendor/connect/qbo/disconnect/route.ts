import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import crypto from "crypto";

/**
 * POST /api/vendor/connect/qbo/disconnect
 *
 * Intuit calls this webhook when a user disconnects your app from within
 * QuickBooks Online. Register this URL as the "Disconnect URL" in the
 * Intuit Developer Portal app settings.
 *
 * Intuit signs the payload with HMAC-SHA256 using your QBO_WEBHOOK_VERIFIER_TOKEN.
 * We verify the signature before deleting the connection.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("intuit-signature");
  const verifierToken = process.env.QBO_WEBHOOK_VERIFIER_TOKEN;

  if (!verifierToken) {
    console.error("QBO disconnect webhook: QBO_WEBHOOK_VERIFIER_TOKEN not set");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 });
  }

  // Verify HMAC-SHA256 signature
  const expected = crypto
    .createHmac("sha256", verifierToken)
    .update(rawBody)
    .digest("base64");

  if (signature !== expected) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: { realmId?: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const realmId = payload.realmId;
  if (!realmId) {
    return NextResponse.json({ error: "missing realmId" }, { status: 400 });
  }

  // Delete the QBO connection for this company
  await prisma.qboConnection.deleteMany({ where: { realmId } });

  return NextResponse.json({ ok: true });
}
