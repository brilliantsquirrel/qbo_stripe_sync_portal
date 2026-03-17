"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";

function ConnectionsPageInner() {
  const searchParams = useSearchParams();
  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  const [qboConnected, setQboConnected] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/vendor/settings")
      .then((r) => r.json())
      .then((d) => {
        setQboConnected(d.qboConnected);
        setStripeConnected(d.stripeConnected);
        setStripeAccountId(d.stripeAccountId ?? null);
      })
      .catch(() => {});
  }, []);

  async function handleQboConnect() {
    const res = await fetch("/api/vendor/connect/qbo", { method: "POST" });
    const data = await res.json();
    if (data.authUri) window.location.href = data.authUri;
  }

  function handleStripeConnect() {
    window.location.href = "/api/vendor/connect/stripe";
  }

  async function handleStripeDisconnect() {
    if (!confirm("Disconnect your Stripe account? Payments will stop working.")) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/vendor/connect/stripe", { method: "DELETE" });
      if (res.ok) {
        setStripeConnected(false);
        setStripeAccountId(null);
      }
    } finally {
      setDisconnecting(false);
    }
  }

  const stripeSuccessMsg =
    successMsg === "stripe_connected" ? "Stripe connected successfully." : null;
  const stripeErrorMsg =
    errorMsg === "stripe_denied"
      ? "Stripe connection was cancelled."
      : errorMsg === "stripe_failed"
      ? "Failed to connect Stripe. Please try again."
      : errorMsg === "stripe_invalid"
      ? "Invalid connection request. Please try again."
      : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Connections</h1>

      {(successMsg === "qbo_connected" || stripeSuccessMsg) && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">
          {successMsg === "qbo_connected"
            ? "QuickBooks Online connected successfully."
            : stripeSuccessMsg}
        </div>
      )}
      {(errorMsg === "qbo_error" || stripeErrorMsg) && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
          {stripeErrorMsg ?? "Failed to connect. Please try again."}
        </div>
      )}

      {/* QBO */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>QuickBooks Online</CardTitle>
            <Badge variant={qboConnected ? "default" : "secondary"}>
              {qboConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <CardDescription>
            Connect your QBO company to sync invoices, customers, and payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleQboConnect} variant={qboConnected ? "outline" : "default"}>
            {qboConnected ? "Reconnect QuickBooks" : "Connect QuickBooks"}
          </Button>
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Stripe</CardTitle>
            <Badge variant={stripeConnected ? "default" : "secondary"}>
              {stripeConnected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <CardDescription>
            Connect your Stripe account to accept payments from your customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stripeConnected && stripeAccountId && (
            <p className="text-sm text-muted-foreground">
              Account: <code className="bg-muted px-1 rounded text-xs">{stripeAccountId}</code>
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={handleStripeConnect} variant={stripeConnected ? "outline" : "default"}>
              {stripeConnected ? "Reconnect Stripe" : "Connect with Stripe"}
            </Button>
            {stripeConnected && (
              <Button
                variant="destructive"
                onClick={handleStripeDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense>
      <ConnectionsPageInner />
    </Suspense>
  );
}
