import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function ProductsPage() {
  const vendor = await requireVendor();

  // Aggregate line items by description to create a product catalog view
  const lineItems = await prisma.invoiceLineItem.findMany({
    where: { invoice: { vendorId: vendor.id } },
    select: {
      description: true,
      quantity: true,
      unitPrice: true,
      amount: true,
    },
  });

  // Group by description
  const productMap = new Map<
    string,
    { description: string; unitPrice: number; totalQuantity: number; totalRevenue: number; lineCount: number }
  >();

  for (const item of lineItems) {
    const existing = productMap.get(item.description);
    if (existing) {
      existing.totalQuantity += item.quantity;
      existing.totalRevenue += item.amount;
      existing.lineCount += 1;
    } else {
      productMap.set(item.description, {
        description: item.description,
        unitPrice: item.unitPrice,
        totalQuantity: item.quantity,
        totalRevenue: item.amount,
        lineCount: 1,
      });
    }
  }

  const products = Array.from(productMap.values()).sort((a, b) =>
    b.totalRevenue - a.totalRevenue
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Products ({products.length})</h1>
      <p className="text-sm text-gray-500">
        Products and services derived from synced invoice line items.
      </p>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-right px-4 py-3 font-medium">Unit price</th>
                <th className="text-right px-4 py-3 font-medium">Total qty</th>
                <th className="text-right px-4 py-3 font-medium">Total revenue</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-3">{p.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {formatCents(p.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {p.totalQuantity % 1 === 0 ? p.totalQuantity : p.totalQuantity.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCents(p.totalRevenue)}
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No products found. Run a sync to import invoice line items.
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
