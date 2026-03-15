"use client";

import { useEffect, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// ─── Add new card form ────────────────────────────────────────────────────────
function AddCardForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-methods?saved=1`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Could not save card");
      setSubmitting(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!stripe || submitting}>
          {submitting ? "Saving…" : "Save card"}
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadMethods = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/payment-methods");
    if (res.ok) {
      const data = await res.json();
      setMethods(data.paymentMethods);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  async function startAddCard() {
    const res = await fetch("/api/payment-methods", { method: "POST" });
    if (!res.ok) return;
    const data = await res.json();
    setSetupSecret(data.clientSecret);
    setShowAddForm(true);
  }

  async function removeMethod(id: string) {
    setRemoving(id);
    await fetch("/api/payment-methods", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethodId: id }),
    });
    setMethods((prev) => prev.filter((m) => m.id !== id));
    setRemoving(null);
  }

  function handleCardSaved() {
    setShowAddForm(false);
    setSetupSecret(null);
    loadMethods();
  }

  const brandLabel = (brand: string) =>
    brand.charAt(0).toUpperCase() + brand.slice(1);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        {!showAddForm && (
          <Button onClick={startAddCard}>Add card</Button>
        )}
      </div>

      {/* Saved cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saved cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : methods.length === 0 ? (
            <p className="text-sm text-gray-500">No saved payment methods.</p>
          ) : (
            methods.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between border rounded-md px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{brandLabel(m.card?.brand ?? m.type)}</Badge>
                  <span className="text-sm font-mono">
                    •••• {m.card?.last4}
                  </span>
                  <span className="text-sm text-gray-500">
                    {m.card?.exp_month}/{m.card?.exp_year}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={removing === m.id}
                  onClick={() => removeMethod(m.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {removing === m.id ? "Removing…" : "Remove"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add card form */}
      {showAddForm && setupSecret && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a new card</CardTitle>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: setupSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <AddCardForm onSuccess={handleCardSaved} />
            </Elements>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
