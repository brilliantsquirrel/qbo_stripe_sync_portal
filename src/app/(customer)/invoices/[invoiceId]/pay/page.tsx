"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── Inner checkout form (needs to be inside <Elements>) ─────────────────────
function CheckoutForm({
  invoiceId,
  amountCents,
  currency,
}: {
  invoiceId: string;
  amountCents: number;
  currency: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/invoices/${invoiceId}?paid=1`,
      },
    });

    // Only reached if confirmPayment doesn't redirect (i.e. an error occurred)
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    }
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!stripe || submitting} className="w-full">
        {submitting ? "Processing…" : `Pay ${formatted}`}
      </Button>
    </form>
  );
}

// ─── Page shell: fetches clientSecret then renders Elements ───────────────────
export default function PayPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(0);
  const [currency, setCurrency] = useState("usd");
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const initPayment = useCallback(async () => {
    try {
      // First load invoice details
      const invRes = await fetch(`/api/invoices/${invoiceId}`);
      if (!invRes.ok) throw new Error("Invoice not found");
      const inv = await invRes.json();

      setAmountCents(inv.amountDue);
      setCurrency(inv.currency);
      setInvoiceNumber(inv.invoiceNumber);

      // Then create PaymentIntent
      const piRes = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: inv.amountDue }),
      });

      if (!piRes.ok) {
        const data = await piRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not initialise payment");
      }

      const data = await piRes.json();
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    initPayment();
  }, [initPayment]);

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center text-gray-500">
        Loading payment form…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-12 space-y-4">
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
        >
          ← Back to invoice
        </button>
        <h1 className="text-2xl font-bold">Pay invoice</h1>
        {invoiceNumber && (
          <p className="text-gray-500 text-sm mt-1">Invoice #{invoiceNumber}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex justify-between">
            <span>Amount due</span>
            <span>{formatted}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <CheckoutForm
                invoiceId={invoiceId}
                amountCents={amountCents}
                currency={currency}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
