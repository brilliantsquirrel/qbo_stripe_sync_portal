/**
 * Next.js middleware.
 *
 * Responsibilities:
 *  1. If a request arrives with ?v=<vendorId>, store it in the qss_vendor_id
 *     cookie so all subsequent requests on this device remember which vendor's
 *     portal they're visiting — even after the query param is gone.
 *
 *  2. Protect customer routes: if the customer session cookie is missing,
 *     redirect to /login?v=<vendorId> (using the stored cookie as fallback).
 */

import { NextRequest, NextResponse } from "next/server";

export const VENDOR_ID_COOKIE = "qss_vendor_id";
const CUSTOMER_SESSION_COOKIE = "qss_customer_session";

/** Routes that require a customer session */
const PROTECTED_CUSTOMER_PATHS = [
  "/dashboard",
  "/invoices",
  "/payments",
  "/payment-methods",
  "/settings",
];

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ── 1. Persist ?v= into a cookie ─────────────────────────────────────────
  const vendorIdFromParam = searchParams.get("v");
  const vendorIdFromCookie = req.cookies.get(VENDOR_ID_COOKIE)?.value;
  const vendorId = vendorIdFromParam ?? vendorIdFromCookie ?? "";

  const res = NextResponse.next();

  if (vendorIdFromParam && vendorIdFromParam !== vendorIdFromCookie) {
    // Store the vendorId so it survives across navigations
    res.cookies.set(VENDOR_ID_COOKIE, vendorIdFromParam, {
      httpOnly: false, // readable by the login page's client-side JS if needed
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });
  }

  // ── 2. Guard customer routes ──────────────────────────────────────────────
  const isProtected = PROTECTED_CUSTOMER_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (isProtected) {
    const sessionToken = req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value;

    if (!sessionToken) {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      if (vendorId) loginUrl.searchParams.set("v", vendorId);
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - static files (images, fonts, etc.)
     * - API routes (they handle auth themselves)
     * - favicon
     */
    "/((?!_next/|api/|.*\\.(?:ico|png|jpg|jpeg|svg|webp|woff2?|ttf|css|js)).*)",
  ],
};
