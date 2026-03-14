import { requireVendor } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createBillingPortalSession } from "@/lib/stripe/billing";
import { redirect } from "next/navigation";
import { Tier } from "@prisma/client";

const TIER_LIMITS: Record<Tier, { revenue: string; invoices: string; price: string }> = {
  STARTER:      { revenue: "$10k/mo",   invoices: "100/mo",    price: "$49/mo" },
  GROWTH:       { revenue: "$50k/mo",   invoices: "500/mo",    price: "$149/mo" },
  PROFESSIONAL: { revenue: "$250k/mo",  invoices: "2,500/mo",  price: "$399/mo" },
  ENTERPRISE:   { revenue: "Unlimited", invoices: "Unlimited", price: "Custom" },
};

export default async function VendorBillingPage() {
  const vendor = await requireVendor();

  const vendorData = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendor.id },
    select: {
      subscriptionTier: true,
      subscriptionStatus: true,
      platformStripeCustomerId: true,
    },
  });

  const thisMonth = new Date();
  const periodStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);

  const usage = await prisma.usageRecord.findFirst({
    where: { vendorId: vendor.id, periodStart: { gte: periodStart } },
  });

  const tier = vendorData.subscriptionTier;
  const limits = TIER_LIMITS[tier];

  async function openBillingPortal() {
    "use server";
    const url = await createBillingPortalSession(
      vendor.id,
      `${process.env.NEXT_PUBLIC_APP_URL}/vendor/billing`
    );
    redirect(url);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Billing</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge
              variant={
                vendorData.subscriptionStatus === "ACTIVE" ? "default"
                  : vendorData.subscriptionStatus === "TRIALING" ? "secondary"
                  : "destructive"
              }
            >
              {vendorData.subscriptionStatus}
            </Badge>
          </div>
          <CardDescription>
            {tier} — {limits.price}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Revenue limit</div>
              <div className="font-semibold">{limits.revenue}</div>
            </div>
            <div>
              <div className="text-gray-500">Invoice limit</div>
              <div className="font-semibold">{limits.invoices}</div>
            </div>
          </div>

          {vendorData.platformStripeCustomerId && (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline">
                Manage subscription →
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Invoices synced</span>
            <span className="font-semibold">{usage?.invoicesSynced ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Revenue processed</span>
            <span className="font-semibold">
              ${((usage?.revenueProcessed ?? 0) / 100).toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
