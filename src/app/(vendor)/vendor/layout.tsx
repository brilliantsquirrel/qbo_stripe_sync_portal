import { redirect } from "next/navigation";
import { getCurrentVendor } from "@/lib/auth/session";
import Link from "next/link";

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
          <div className="font-semibold text-lg">QBO Stripe Sync Portal</div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/vendor/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/vendor/customers" className="text-gray-600 hover:text-gray-900">Customers</Link>
            <Link href="/vendor/sync" className="text-gray-600 hover:text-gray-900">Sync</Link>
            <Link href="/vendor/settings/connections" className="text-gray-600 hover:text-gray-900">Connections</Link>
            <Link href="/vendor/billing" className="text-gray-600 hover:text-gray-900">Billing</Link>
          </nav>
          <div className="text-sm text-gray-500">{vendor.email}</div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
