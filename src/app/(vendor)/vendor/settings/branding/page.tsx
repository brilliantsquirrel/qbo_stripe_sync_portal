"use client";

import { useState, useEffect } from "react";
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

const FONT_OPTIONS = [
  { label: "System default", value: "" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, serif" },
  { label: "Helvetica Neue", value: "'Helvetica Neue', Helvetica, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Monospace", value: "ui-monospace, monospace" },
];

const DEFAULTS = {
  portalTitle: "",
  brandBgColor: "#f9fafb",
  brandTextColor: "#111827",
  brandLinkColor: "#2563eb",
  brandButtonBg: "#111827",
  brandButtonText: "#ffffff",
  brandFontFamily: "",
};

type Branding = typeof DEFAULTS;

export default function BrandingPage() {
  const [form, setForm] = useState<Branding>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/vendor/branding")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          portalTitle: data.portalTitle ?? "",
          brandBgColor: data.brandBgColor ?? DEFAULTS.brandBgColor,
          brandTextColor: data.brandTextColor ?? DEFAULTS.brandTextColor,
          brandLinkColor: data.brandLinkColor ?? DEFAULTS.brandLinkColor,
          brandButtonBg: data.brandButtonBg ?? DEFAULTS.brandButtonBg,
          brandButtonText: data.brandButtonText ?? DEFAULTS.brandButtonText,
          brandFontFamily: data.brandFontFamily ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof Branding, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          portalTitle: form.portalTitle || null,
          brandFontFamily: form.brandFontFamily || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
    } catch {
      setError("Failed to save branding settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  const previewFont = form.brandFontFamily || "system-ui, sans-serif";

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Customer Portal Branding</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>Customize the portal title your customers see.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="portalTitle">Portal title</Label>
              <Input
                id="portalTitle"
                placeholder="Customer Portal"
                value={form.portalTitle}
                onChange={(e) => set("portalTitle", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Shown in the header. Defaults to "Customer Portal" if left blank.
              </p>
            </div>
            <div>
              <Label htmlFor="brandFontFamily">Font</Label>
              <select
                id="brandFontFamily"
                value={form.brandFontFamily}
                onChange={(e) => set("brandFontFamily", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FONT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
            <CardDescription>Set the color palette for the customer portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  { key: "brandBgColor", label: "Background" },
                  { key: "brandTextColor", label: "Body text" },
                  { key: "brandLinkColor", label: "Links" },
                  { key: "brandButtonBg", label: "Button background" },
                  { key: "brandButtonText", label: "Button text" },
                ] as { key: keyof Branding; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <input
                    type="color"
                    id={key}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-9 w-12 rounded border cursor-pointer p-0.5"
                  />
                  <Label htmlFor={key}>{label}</Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Approximate look of the customer portal header.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden rounded-b-xl">
            <div
              style={{
                backgroundColor: form.brandBgColor,
                color: form.brandTextColor,
                fontFamily: previewFont,
              }}
            >
              <div
                className="border-b px-4 h-14 flex items-center justify-between"
                style={{ backgroundColor: "white" }}
              >
                <span className="font-semibold text-base">
                  {form.portalTitle || "Customer Portal"}
                </span>
                <div className="flex gap-4 text-sm" style={{ color: form.brandLinkColor }}>
                  <span className="cursor-pointer hover:underline">Invoices</span>
                  <span className="cursor-pointer hover:underline">Payments</span>
                </div>
              </div>
              <div className="px-6 py-8 flex items-center gap-4">
                <div className="text-sm" style={{ color: form.brandTextColor }}>
                  Here is some sample body text to preview your font and text color.{" "}
                  <a href="#" style={{ color: form.brandLinkColor }}>This is a link.</a>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md text-sm font-medium shrink-0"
                  style={{ backgroundColor: form.brandButtonBg, color: form.brandButtonText }}
                >
                  Pay now
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Branding saved.</p>}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save branding"}
        </Button>
      </form>
    </div>
  );
}
