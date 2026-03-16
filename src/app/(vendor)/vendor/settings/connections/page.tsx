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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSearchParams } from "next/navigation";

function ConnectionsPageInner() {
  const searchParams = useSearchParams();
  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  const [qboConnected, setQboConnected] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeKey, setStripeKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeError, setStripeError] = useState("");

  // In production, fetch current connection status
  useEffect(() => {
    fetch("/api/vendor/settings")
      .then((r) => r.json())
      .then((d) => {
        setQboConnected(d.qboConnected);
        setStripeConnected(d.stripeConnected);
      })
      .catch(() => {});
  }, []);

  async function handleQboConnect() {
    const res = await fetch("/api/vendor/connect/qbo", { method: "POST" });
    const data = await res.json();
    if (data.authUri) window.location.href = data.authUri;
  }

  async function handleStripeConnect(e: React.FormEvent) {
    e.preventDefault();
    setSavingStripe(true);
    setStripeError("");
    try {
      const res = await fetch("/api/vendor/connect/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: stripeKey, webhookSecret: stripeWebhookSecret }),
      });
      let data: { error?: string; success?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        // response body was empty or not JSON
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }
      setStripeConnected(true);
      setStripeKey("");
      setStripeWebhookSecret("");
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingStripe(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Connections</h1>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">
          {successMsg === "qbo_connected" && "QuickBooks Online connected successfully."}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 text-sm">
          Failed to connect. Please try again.
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
            Add your Stripe restricted API key and webhook secret.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripeError && (
            <p className="text-sm text-red-600 mb-3">{stripeError}</p>
          )}
          <form onSubmit={handleStripeConnect} className="space-y-4">
            <div>
              <Label>Restricted Secret Key</Label>
              <Input
                type="password"
                placeholder="sk_live_..."
                value={stripeKey}
                onChange={(e) => setStripeKey(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Create a restricted key in your Stripe dashboard with read/write access to Customers, PaymentIntents, and Invoices.
              </p>
            </div>
            <div>
              <Label>Webhook Signing Secret</Label>
              <Input
                type="password"
                placeholder="whsec_..."
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Point your Stripe webhook to: <code className="bg-gray-100 px-1 rounded">{typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/stripe</code>
              </p>
            </div>
            <Button type="submit" disabled={savingStripe}>
              {savingStripe ? "Saving…" : stripeConnected ? "Update Stripe" : "Connect Stripe"}
            </Button>
          </form>
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
