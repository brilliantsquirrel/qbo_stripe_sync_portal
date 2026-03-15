import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnchorButton } from "@/components/shared/link-button";
import { formatMoney } from "@/lib/utils/money";

export default async function VendorCustomersPage() {
  const vendor = await requireVendor();

  const customers = await prisma.customer.findMany({
    where: { vendorId: vendor.id },
    include: {
      _count: { select: { invoices: true } },
      invoices: {
        where: { status: { in: ["UNPAID", "PARTIAL"] } },
        select: { amountDue: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Customers ({customers.length})</h1>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Connections</th>
                <th className="text-right px-4 py-3 font-medium">Invoices</th>
                <th className="text-right px-4 py-3 font-medium">Outstanding</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const outstanding = c.invoices.reduce(
                  (sum, inv) => sum + inv.amountDue,
                  0
                );
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {c.qboCustomerId && (
                          <Badge variant="outline" className="text-xs">QBO</Badge>
                        )}
                        {c.stripeCustomerId && (
                          <Badge variant="outline" className="text-xs">Stripe</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{c._count.invoices}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {outstanding > 0 ? (
                        <span className="text-red-600">
                          {formatMoney(outstanding)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <AnchorButton
                        href={`/api/vendor/customers/${c.id}/impersonate`}
                        size="sm"
                        variant="outline"
                        target="_blank"
                      >
                        View portal ↗
                      </AnchorButton>
                    </td>
                  </tr>
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No customers synced yet. Run a sync to import customers.
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
