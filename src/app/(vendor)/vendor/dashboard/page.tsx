import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { formatMoney } from "@/lib/utils/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/shared/link-button";

export default async function VendorDashboardPage() {
  const vendor = await requireVendor();

  const [customerCount, invoiceStats, lastSync, recentErrors, qboConnection, stripeConnection] =
    await Promise.all([
      prisma.customer.count({ where: { vendorId: vendor.id } }),
      prisma.invoice.groupBy({
        by: ["status"],
        where: { vendorId: vendor.id },
        _count: { status: true },
        _sum: { amountDue: true },
      }),
      prisma.syncLog.findFirst({
        where: { vendorId: vendor.id },
        orderBy: { startedAt: "desc" },
      }),
      prisma.syncLog.count({
        where: {
          vendorId: vendor.id,
          status: "FAILED",
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.qboConnection.findUnique({
        where: { vendorId: vendor.id },
        select: { id: true, realmId: true },
      }),
      prisma.stripeConnection.findUnique({
        where: { vendorId: vendor.id },
        select: { id: true },
      }),
    ]);

  const totalOutstanding = invoiceStats.reduce(
    (sum, s) => sum + (s._sum.amountDue ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendor Dashboard</h1>

      <div className="flex gap-3">
        <Badge variant={qboConnection ? "default" : "destructive"}>
          QBO: {qboConnection ? `Connected (${qboConnection.realmId})` : "Not connected"}
        </Badge>
        <Badge variant={stripeConnection ? "default" : "destructive"}>
          Stripe: {stripeConnection ? "Connected" : "Not connected"}
        </Badge>
      </div>

      {(!qboConnection || !stripeConnection) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <p className="text-sm text-amber-800">
              Complete your setup to start syncing.{" "}
              <a href="/vendor/settings/connections" className="underline font-medium">
                Connect now →
              </a>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{customerCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {formatMoney(totalOutstanding)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {lastSync ? new Date(lastSync.startedAt).toLocaleString() : "Never"}
            </div>
            {lastSync && (
              <Badge
                variant={lastSync.status === "COMPLETED" ? "default" : "destructive"}
                className="mt-1"
              >
                {lastSync.status}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Errors (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${recentErrors > 0 ? "text-red-600" : ""}`}>
              {recentErrors}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <LinkButton href="/vendor/sync">View Sync Status</LinkButton>
        <LinkButton href="/vendor/customers" variant="outline">View Customers</LinkButton>
      </div>
    </div>
  );
}
