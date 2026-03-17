import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "PAID") return "default";
  if (status === "PARTIAL") return "secondary";
  if (status === "VOID") return "outline";
  return "destructive"; // UNPAID
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function InvoicesPage() {
  const vendor = await requireVendor();

  const invoices = await prisma.invoice.findMany({
    where: { vendorId: vendor.id },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices ({invoices.length})</h1>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Issued</th>
                <th className="text-left px-4 py-3 font-medium">Due</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {inv.invoiceNumber ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">{inv.customer.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(inv.status)}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(inv.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">{formatCents(inv.amountTotal)}</td>
                  <td className="px-4 py-3 text-right text-green-700">{formatCents(inv.amountPaid)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {inv.amountDue > 0 ? (
                      <span className="text-red-600">{formatCents(inv.amountDue)}</span>
                    ) : (
                      formatCents(inv.amountDue)
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No invoices synced yet. Run a sync to import invoices.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
