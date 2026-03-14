"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/auto-pay")
      .then((r) => r.json())
      .then((d) => {
        setAutoPayEnabled(d.autoPayEnabled ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleAutoPayToggle(checked: boolean) {
    setSaving(true);
    setAutoPayEnabled(checked);
    await fetch("/api/settings/auto-pay", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoPayEnabled: checked }),
    });
    setSaving(false);
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Auto-Pay</CardTitle>
          <CardDescription>
            Automatically charge your saved payment method when invoices are due.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="auto-pay">Enable auto-pay</Label>
          <Switch
            id="auto-pay"
            checked={autoPayEnabled}
            onCheckedChange={handleAutoPayToggle}
            disabled={saving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Reviewer</CardTitle>
          <CardDescription>
            Designate someone at your company to review and approve payments before they are processed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">Configure reviewer →</Button>
        </CardContent>
      </Card>
    </div>
  );
}
