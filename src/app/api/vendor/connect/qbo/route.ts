import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { createOAuthClient } from "@/lib/qbo/client";
import { prisma } from "@/lib/db/client";

export async function POST() {
  await requireVendor();

  const oauthClient = createOAuthClient();
  const authUri = oauthClient.authorizeUri({
    scope: [
      "com.intuit.quickbooks.accounting",
      "com.intuit.quickbooks.payment",
    ],
    state: "qbo-connect",
  });

  return NextResponse.json({ authUri });
}

export async function DELETE() {
  const vendor = await requireVendor();

  await prisma.qboConnection.deleteMany({ where: { vendorId: vendor.id } });

  return NextResponse.json({ ok: true });
}
