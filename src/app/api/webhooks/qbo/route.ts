/**
 * QBO webhook handler for data change notifications.
 * Intuit sends a notification when QBO data changes — we enqueue a sync.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { prisma } from "@/lib/db/client";
import { enqueueImmediateSync } from "@/lib/sync/scheduler";

const QBO_WEBHOOK_VERIFIER_TOKEN = process.env.QBO_WEBHOOK_VERIFIER_TOKEN!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("intuit-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify Intuit HMAC signature
  const expected = createHmac("sha256", QBO_WEBHOOK_VERIFIER_TOKEN)
    .update(body)
    .digest("base64");

  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(body) as {
      eventNotifications?: Array<{
        realmId: string;
        dataChangeEvent: { entities: Array<{ name: string; id: string }> };
      }>;
    };

    for (const notification of payload.eventNotifications ?? []) {
      const { realmId } = notification;

      // Find the vendor with this realmId
      const connection = await prisma.qboConnection.findFirst({
        where: { realmId },
        select: { vendorId: true },
      });

      if (connection) {
        // Enqueue a sync for this vendor
        await enqueueImmediateSync(connection.vendorId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("QBO webhook error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
