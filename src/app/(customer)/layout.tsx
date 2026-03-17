import { redirect } from "next/navigation";
import { getCurrentCustomer, getCurrentVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import Link from "next/link";
import { HamburgerNav } from "@/components/shared/hamburger-nav";

const CUSTOMER_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/settings", label: "Settings" },
];

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customer, vendor] = await Promise.all([
    getCurrentCustomer(),
    getCurrentVendor(),
  ]);
  if (!customer) redirect("/login");

  // A vendor browsing with a customer session cookie = impersonation mode
  const isImpersonating = !!vendor;

  // Fetch vendor branding
  const branding = await prisma.vendor.findUnique({
    where: { id: customer.vendorId },
    select: {
      portalTitle: true,
      brandBgColor: true,
      brandTextColor: true,
      brandLinkColor: true,
      brandButtonBg: true,
      brandButtonText: true,
      brandFontFamily: true,
    },
  });

  const bg = branding?.brandBgColor ?? "#f9fafb";
  const text = branding?.brandTextColor ?? "#111827";
  const link = branding?.brandLinkColor ?? "#2563eb";
  const buttonBg = branding?.brandButtonBg ?? "#111827";
  const buttonText = branding?.brandButtonText ?? "#ffffff";
  const font = branding?.brandFontFamily ?? "system-ui, sans-serif";
  const title = branding?.portalTitle ?? "Customer Portal";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: bg, color: text, fontFamily: font }}
    >
      {/* Inject CSS variables so child components can use them */}
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --brand-bg: ${bg};
            --brand-text: ${text};
            --brand-link: ${link};
            --brand-button-bg: ${buttonBg};
            --brand-button-text: ${buttonText};
          }
        `,
      }} />

      {/* Impersonation banner */}
      {isImpersonating && (
        <div className="bg-amber-400 text-amber-950 text-sm font-medium flex items-center justify-between px-4 py-2">
          <span>
            👁 Viewing as <strong>{customer.name}</strong> ({customer.email})
          </span>
          <Link
            href="/vendor/customers"
            className="rounded bg-amber-950 text-amber-50 px-3 py-1 text-xs font-semibold hover:bg-amber-900 transition-colors"
          >
            ← Back to vendor view
          </Link>
        </div>
      )}

      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HamburgerNav items={CUSTOMER_NAV} />
            <span className="font-semibold text-lg">{title}</span>
          </div>
          <div className="text-sm text-gray-500">{customer.name}</div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
