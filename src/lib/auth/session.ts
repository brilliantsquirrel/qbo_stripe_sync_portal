import { cookies } from "next/headers";
import { getCustomerFromSession } from "@/lib/auth/magic-link";
import { auth } from "@/lib/auth/config";

export const CUSTOMER_SESSION_COOKIE = "qss_customer_session";

/**
 * Get the currently authenticated customer from the session cookie.
 * Returns null if no valid session exists.
 */
export async function getCurrentCustomer() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  return getCustomerFromSession(sessionToken);
}

/**
 * Get the currently authenticated vendor admin from Auth.js session.
 */
export async function getCurrentVendor() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

/**
 * Require a customer session — call in Server Components/Actions.
 * Redirects to /login if not authenticated.
 */
export async function requireCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return customer;
}

/**
 * Require a vendor session — call in Server Components/Actions.
 */
export async function requireVendor() {
  const vendor = await getCurrentVendor();
  if (!vendor) {
    const { redirect } = await import("next/navigation");
    redirect("/admin-login");
  }
  return vendor;
}

/**
 * Require a platform admin session.
 */
export async function requirePlatformAdmin() {
  const vendor = await requireVendor();
  if (vendor.role !== "PLATFORM_ADMIN") {
    const { redirect } = await import("next/navigation");
    redirect("/vendor/dashboard");
  }
  return vendor;
}
