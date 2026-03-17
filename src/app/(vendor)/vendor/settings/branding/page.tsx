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

const FAVICON_PRESETS = [
  { label: "Briefcase", emoji: "💼" },
  { label: "Bar chart", emoji: "📊" },
  { label: "Money bag", emoji: "💰" },
  { label: "Office", emoji: "🏢" },
  { label: "Lightning", emoji: "⚡" },
  { label: "Sync", emoji: "🔄" },
  { label: "Clipboard", emoji: "📋" },
  { label: "Credit card", emoji: "💳" },
  { label: "Star", emoji: "🌟" },
  { label: "Target", emoji: "🎯" },
];

function emojiToDataUrl(emoji: string): string {
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`;
}

const DEFAULTS = {
  portalTitle: "",
  siteName: "",
  logoUrl: "",
  faviconUrl: "",
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
  const [faviconMode, setFaviconMode] = useState<"preset" | "url">("preset");

  useEffect(() => {
    fetch("/api/vendor/branding")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          portalTitle: data.portalTitle ?? "",
          siteName: data.siteName ?? "",
          logoUrl: data.logoUrl ?? "",
          faviconUrl: data.faviconUrl ?? "",
          brandBgColor: data.brandBgColor ?? DEFAULTS.brandBgColor,
          brandTextColor: data.brandTextColor ?? DEFAULTS.brandTextColor,
          brandLinkColor: data.brandLinkColor ?? DEFAULTS.brandLinkColor,
          brandButtonBg: data.brandButtonBg ?? DEFAULTS.brandButtonBg,
          brandButtonText: data.brandButtonText ?? DEFAULTS.brandButtonText,
          brandFontFamily: data.brandFontFamily ?? "",
        });
        // Detect if the saved faviconUrl is a custom URL (not a data URI)
        if (data.faviconUrl && !data.faviconUrl.startsWith("data:")) {
          setFaviconMode("url");
        }
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
          siteName: form.siteName || null,
          logoUrl: form.logoUrl || null,
          faviconUrl: form.faviconUrl || null,
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
      <h1 className="text-2xl font-bold">Branding</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Site Identity */}
        <Card>
          <CardHeader>
            <CardTitle>Site Identity</CardTitle>
            <CardDescription>
              Customize the name and logo shown in the vendor admin and customer portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                placeholder="QBO Stripe Sync Portal"
                value={form.siteName}
                onChange={(e) => set("siteName", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Shown in the vendor admin header and browser tab. Defaults to &ldquo;QBO Stripe Sync Portal&rdquo;.
              </p>
            </div>
            <div>
              <Label htmlFor="portalTitle">Customer portal title</Label>
              <Input
                id="portalTitle"
                placeholder="Customer Portal"
                value={form.portalTitle}
                onChange={(e) => set("portalTitle", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Shown in the customer portal header. Defaults to &ldquo;Customer Portal&rdquo;.
              </p>
            </div>
            <div>
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input
                id="logoUrl"
                type="url"
                placeholder="https://example.com/logo.png"
                value={form.logoUrl}
                onChange={(e) => set("logoUrl", e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Displayed next to the site name in the vendor admin header and customer portal.
              </p>
              {form.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logoUrl}
                  alt="Logo preview"
                  className="mt-2 h-8 w-auto object-contain rounded border"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card>
          <CardHeader>
            <CardTitle>Favicon</CardTitle>
            <CardDescription>
              Choose a favicon preset or provide a custom URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFaviconMode("preset")}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  faviconMode === "preset"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Presets
              </button>
              <button
                type="button"
                onClick={() => setFaviconMode("url")}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  faviconMode === "url"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Custom URL
              </button>
            </div>

            {faviconMode === "preset" ? (
              <div className="grid grid-cols-5 gap-3">
                {FAVICON_PRESETS.map((preset) => {
                  const dataUrl = emojiToDataUrl(preset.emoji);
                  const isSelected = form.faviconUrl === dataUrl;
                  return (
                    <button
                      key={preset.emoji}
                      type="button"
                      title={preset.label}
                      onClick={() => set("faviconUrl", dataUrl)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{preset.emoji}</span>
                      <span className="text-xs text-gray-500">{preset.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  title="None"
                  onClick={() => set("faviconUrl", "")}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                    !form.faviconUrl
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-2xl text-gray-300">∅</span>
                  <span className="text-xs text-gray-500">None</span>
                </button>
              </div>
            ) : (
              <div>
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  type="url"
                  placeholder="https://example.com/favicon.ico"
                  value={form.faviconUrl.startsWith("data:") ? "" : form.faviconUrl}
                  onChange={(e) => set("faviconUrl", e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Link to a .ico, .png, or .svg file.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Font */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>Set the font used in the customer portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="brandFontFamily">Font</Label>
            <select
              id="brandFontFamily"
              value={form.brandFontFamily}
              onChange={(e) => set("brandFontFamily", e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
                <div className="flex items-center gap-2">
                  {form.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.logoUrl} alt="" className="h-7 w-auto object-contain" />
                  )}
                  <span className="font-semibold text-base">
                    {form.portalTitle || "Customer Portal"}
                  </span>
                </div>
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

        {/* Stripe invoice branding */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Invoice Branding</CardTitle>
            <CardDescription>
              Customize how your invoices look in Stripe — logos, colors, and contact info.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="https://dashboard.stripe.com/settings/branding"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              Open Stripe branding settings ↗
            </a>
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
