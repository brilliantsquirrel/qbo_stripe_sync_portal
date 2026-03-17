import { redirect } from "next/navigation";
import { getCurrentVendor } from "@/lib/auth/session";
import { HamburgerNav } from "@/components/shared/hamburger-nav";

const VENDOR_NAV = [
  { href: "/vendor/dashboard", label: "Dashboard" },
  { href: "/vendor/customers", label: "Customers" },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HamburgerNav items={VENDOR_NAV} />
            <span className="font-semibold text-lg">QBO Stripe Sync Portal</span>
          </div>
          <div className="text-sm text-gray-500">{vendor.email}</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
