import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatMoney } from "@/lib/utils/money";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/shared/link-button";

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
  VOID: "Void",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  UNPAID: "destructive",
  PARTIAL: "secondary",
  PAID: "default",
  VOID: "outline",
};

export default async function InvoicesPage() {
  const customer = await requireCustomer();

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Invoices</h1>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Invoice</th>
                <th className="text-left px-4 py-3 font-medium">Issued</th>
                <th className="text-left px-4 py-3 font-medium">Due</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Amount Due</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {inv.invoiceNumber ? `#${inv.invoiceNumber}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(inv.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANTS[inv.status]}>
                      {STATUS_LABELS[inv.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatMoney(inv.amountDue, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatMoney(inv.amountTotal, inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <LinkButton href={`/invoices/${inv.id}`} size="sm" variant="outline">
                      View
                    </LinkButton>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No invoices found.
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
