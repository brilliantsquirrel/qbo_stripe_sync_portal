import { redirect } from "next/navigation";
import Image from "next/image";
import { getCurrentVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { HamburgerNav } from "@/components/shared/hamburger-nav";
import { BrandingApplier } from "@/components/shared/branding-applier";

const VENDOR_NAV = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/customers", label: "Customers" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/invoices", label: "Invoices" },
  { href: "/vendor/payments", label: "Payments" },
  { href: "/vendor/sync", label: "Sync" },
  { href: "/vendor/settings/connections", label: "Connections" },
  { href: "/vendor/settings/branding", label: "Branding" },
  { href: "/vendor/billing", label: "Billing" },
];

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const vendor = await getCurrentVendor();
  if (!vendor) redirect("/admin-login");

  const branding = await prisma.vendor.findUnique({
    where: { id: vendor.id },
    select: { siteName: true, logoUrl: true, faviconUrl: true },
  });

  const displayName = branding?.siteName || "QBO Stripe Sync Portal";

  return (
    <div className="min-h-screen bg-gray-50">
      <BrandingApplier
        siteName={branding?.siteName}
        faviconUrl={branding?.faviconUrl}
      />
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HamburgerNav items={VENDOR_NAV} />
            {branding?.logoUrl && (
              <Image
                src={branding.logoUrl}
                alt={displayName}
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
              />
            )}
            <span className="font-semibold text-lg">{displayName}</span>
          </div>
          <div className="text-sm text-gray-500">{vendor.email}</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
