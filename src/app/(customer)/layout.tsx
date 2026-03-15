import { redirect } from "next/navigation";
import { getCurrentCustomer, getCurrentVendor } from "@/lib/auth/session";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-gray-50">
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
          <div className="font-semibold text-lg">Customer Portal</div>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link href="/invoices" className="text-gray-600 hover:text-gray-900">Invoices</Link>
            <Link href="/payments" className="text-gray-600 hover:text-gray-900">Payments</Link>
            <Link href="/payment-methods" className="text-gray-600 hover:text-gray-900">Payment Methods</Link>
            <Link href="/settings" className="text-gray-600 hover:text-gray-900">Settings</Link>
          </nav>
          <div className="text-sm text-gray-500">{customer.name}</div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
