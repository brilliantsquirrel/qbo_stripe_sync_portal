import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatMoney } from "@/lib/utils/money";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/shared/link-button";

export default async function DashboardPage() {
  const customer = await requireCustomer();

  const [invoices, totalDue, recentPayments] = await Promise.all([
    prisma.invoice.findMany({
      where: { customerId: customer.id, status: { in: ["UNPAID", "PARTIAL"] } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.invoice.aggregate({
      where: { customerId: customer.id, status: { in: ["UNPAID", "PARTIAL"] } },
      _sum: { amountDue: true },
    }),
    prisma.payment.findMany({
      where: { customerId: customer.id, status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const balanceDue = totalDue._sum.amountDue ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatMoney(balanceDue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {invoices.length} unpaid invoice{invoices.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatMoney(recentPayments.reduce((sum, p) => sum + p.amount, 0))}
            </div>
            <p className="text-xs text-gray-500 mt-1">Last 5 payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <LinkButton href="/invoices" size="sm">View all invoices</LinkButton>
            <LinkButton href="/payment-methods" size="sm" variant="outline">
              Manage payment methods
            </LinkButton>
          </CardContent>
        </Card>
      </div>

      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unpaid Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {inv.invoiceNumber ? `#${inv.invoiceNumber}` : inv.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      Due {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={inv.status === "PARTIAL" ? "secondary" : "destructive"}>
                      {inv.status === "PARTIAL" ? "Partial" : "Unpaid"}
                    </Badge>
                    <div className="font-semibold">{formatMoney(inv.amountDue)}</div>
                    <LinkButton href={`/invoices/${inv.id}`} size="sm">Pay</LinkButton>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
