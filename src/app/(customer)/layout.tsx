import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/auth/session";
import Link from "next/link";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50">
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
