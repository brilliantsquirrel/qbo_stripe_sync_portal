import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { generateSessionToken } from "@/lib/utils/crypto";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/session";

const IMPERSONATION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * GET /api/vendor/customers/[id]/impersonate
 *
 * Vendor-only: creates a real customer session for the given customer,
 * sets the session cookie, and redirects to /dashboard.
 * Designed to be opened in a new tab — the vendor's own Auth.js session
 * is unaffected since it lives in a different cookie.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const vendor = await requireVendor();
  const { id: customerId } = await params;

  // Verify the customer belongs to this vendor
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, vendorId: vendor.id },
    select: { id: true, name: true, email: true },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Create a real customer session (bypasses OTP — vendor-only privilege)
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + IMPERSONATION_TTL_MS);

  await prisma.customerSession.create({
    data: { customerId: customer.id, sessionToken, expiresAt },
  });

  // Set the session cookie and redirect to the customer portal
  const response = NextResponse.redirect(
    new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
  );

  response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return response;
}
