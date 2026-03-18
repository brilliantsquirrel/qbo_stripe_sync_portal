import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function formatCents(cents: number) {
  if (cents === 0) return <span className="text-gray-400 text-xs">Variable</span>;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function ProductsPage() {
  const vendor = await requireVendor();

  const products = await prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const activeCount = products.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products ({products.length})</h1>
        {products.length > 0 && (
          <p className="text-sm text-gray-500">{activeCount} active</p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Description</th>
                <th className="text-left px-4 py-3 font-medium">Connections</th>
                <th className="text-right px-4 py-3 font-medium">Unit price</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {p.description ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {p.qboItemId && (
                        <Badge variant="outline" className="text-xs">QBO</Badge>
                      )}
                      {p.stripeProductId && (
                        <Badge variant="outline" className="text-xs">Stripe</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatCents(p.unitPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={p.active ? "default" : "secondary"}>
                      {p.active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No products synced yet. Run a sync to import products from QuickBooks.
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
