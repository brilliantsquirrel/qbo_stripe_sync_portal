import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatMoney } from "@/lib/utils/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnchorButton } from "@/components/shared/link-button";

export default async function PaymentsPage() {
  const customer = await requireCustomer();

  const payments = await prisma.payment.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      invoice: { select: { invoiceNumber: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment History</h1>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {p.invoice.invoiceNumber ? `#${p.invoice.invoiceNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        p.status === "SUCCEEDED"
                          ? "default"
                          : p.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.stripePaymentIntentId && p.status === "SUCCEEDED" && (
                      <AnchorButton
                        href={`/api/payments/${p.id}/receipt`}
                        size="sm"
                        variant="ghost"
                        target="_blank"
                      >
                        Receipt
                      </AnchorButton>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No payments found.
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
