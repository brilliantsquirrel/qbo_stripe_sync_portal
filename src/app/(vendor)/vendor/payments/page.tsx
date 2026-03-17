import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "SUCCEEDED") return "default";
  if (status === "PROCESSING") return "secondary";
  if (status === "PENDING") return "outline";
  if (status === "REFUNDED") return "secondary";
  return "destructive"; // FAILED
}

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function PaymentsPage() {
  const vendor = await requireVendor();

  const payments = await prisma.payment.findMany({
    where: { vendorId: vendor.id },
    include: {
      customer: { select: { name: true } },
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const totalSucceeded = payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments ({payments.length})</h1>
        {totalSucceeded > 0 && (
          <p className="text-sm text-gray-600">
            Total collected: <span className="font-semibold text-green-700">{formatCents(totalSucceeded)}</span>
          </p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pmt) => (
                <tr key={pmt.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(pmt.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">{pmt.customer.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {pmt.invoice.invoiceNumber ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(pmt.status)}>{pmt.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCents(pmt.amount)}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No payments recorded yet.
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
