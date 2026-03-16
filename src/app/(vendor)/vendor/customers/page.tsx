import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerRow } from "./customer-row";

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
                <th className="text-left px-4 py-3 font-medium">Email(s)</th>
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
                  <CustomerRow
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    email={c.email}
                    allowedEmails={c.allowedEmails}
                    qboCustomerId={c.qboCustomerId}
                    stripeCustomerId={c.stripeCustomerId}
                    invoiceCount={c._count.invoices}
                    outstanding={outstanding}
                  />
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
