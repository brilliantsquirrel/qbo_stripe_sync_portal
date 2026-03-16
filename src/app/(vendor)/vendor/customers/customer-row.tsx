"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnchorButton } from "@/components/shared/link-button";
import { formatMoney } from "@/lib/utils/money";
import { Pencil, Check, X, Send, Loader2 } from "lucide-react";

interface CustomerRowProps {
  id: string;
  name: string;
  email: string;
  allowedEmails: string | null;
  qboCustomerId: string | null;
  stripeCustomerId: string | null;
  invoiceCount: number;
  outstanding: number;
}

export function CustomerRow({
  id,
  name,
  email,
  allowedEmails: initialAllowedEmails,
  qboCustomerId,
  stripeCustomerId,
  invoiceCount,
  outstanding,
}: CustomerRowProps) {
  const [editing, setEditing] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState(
    initialAllowedEmails ?? email
  );
  const [draftEmails, setDraftEmails] = useState(
    initialAllowedEmails ?? email
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Email editing ─────────────────────────────────────────────────────────

  function startEditing() {
    // Pre-fill with the full visible list (primary + any extras), comma-separated
    setDraftEmails(emailList.join(", "));
    setSaveError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEditing() {
    setEditing(false);
    setSaveError(null);
  }

  async function saveEmails() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/vendor/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedEmails: draftEmails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAllowedEmails(data.allowedEmails ?? email);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save — try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Send magic link ───────────────────────────────────────────────────────

  // Derive the displayed list purely from saved state so removals take effect.
  // Fall back to the primary email only when nothing has been saved yet.
  const emailList = allowedEmails
    ? Array.from(
        new Set(allowedEmails.split(",").map((e) => e.trim()).filter(Boolean))
      )
    : [email];

  async function sendLink(targetEmail: string) {
    setSending(true);
    setSentTo(null);
    setSendError(null);
    try {
      const res = await fetch(`/api/vendor/customers/${id}/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSentTo(targetEmail);
      setTimeout(() => setSentTo(null), 4000);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
      setTimeout(() => setSendError(null), 5000);
    } finally {
      setSending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <tr className="border-b last:border-0 hover:bg-gray-50 align-top">
      {/* Name */}
      <td className="px-4 py-3 font-medium">{name}</td>

      {/* Email(s) */}
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={draftEmails}
              onChange={(e) => setDraftEmails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEmails();
                if (e.key === "Escape") cancelEditing();
              }}
              placeholder="email1@co.com, email2@co.com"
              className="text-sm border rounded px-2 py-1 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={saveEmails}
              disabled={saving}
              title="Save"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5 text-green-600" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={cancelEditing}
              disabled={saving}
              title="Cancel"
            >
              <X className="h-3.5 w-3.5 text-gray-500" />
            </Button>
            {saveError && (
              <span className="text-xs text-red-500">{saveError}</span>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            <div className="flex flex-col gap-0.5">
              {emailList.map((e) => (
                <span key={e} className="text-gray-600 text-sm leading-snug">
                  {e}
                </span>
              ))}
            </div>
            <button
              onClick={startEditing}
              className="mt-0.5 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              title="Edit allowed emails"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </td>

      {/* Connections */}
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {qboCustomerId && (
            <Badge variant="outline" className="text-xs">QBO</Badge>
          )}
          {stripeCustomerId && (
            <Badge variant="outline" className="text-xs">Stripe</Badge>
          )}
        </div>
      </td>

      {/* Invoice count */}
      <td className="px-4 py-3 text-right">{invoiceCount}</td>

      {/* Outstanding balance */}
      <td className="px-4 py-3 text-right font-semibold">
        {outstanding > 0 ? (
          <span className="text-red-600">{formatMoney(outstanding)}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {sendError && (
          <p className="text-xs text-red-500 text-right mb-1">{sendError}</p>
        )}
        <div className="flex items-center justify-end gap-2">
          {/* Send magic link — one button per email if there are multiple */}
          {emailList.length === 1 ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendLink(emailList[0])}
              disabled={sending}
              title={`Send login code to ${emailList[0]}`}
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : sentTo ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">
                {sentTo ? "Sent!" : "Send link"}
              </span>
            </Button>
          ) : (
            <div className="flex flex-col gap-1 items-end">
              {emailList.map((e) => (
                <Button
                  key={e}
                  size="sm"
                  variant="outline"
                  onClick={() => sendLink(e)}
                  disabled={sending}
                  title={`Send login code to ${e}`}
                  className="text-xs h-7"
                >
                  {sending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : sentTo === e ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  <span className="ml-1 max-w-[120px] truncate">{sentTo === e ? "Sent!" : e}</span>
                </Button>
              ))}
            </div>
          )}

          <AnchorButton
            href={`/api/vendor/customers/${id}/impersonate`}
            size="sm"
            variant="outline"
            target="_blank"
          >
            View portal ↗
          </AnchorButton>
        </div>
      </td>
    </tr>
  );
}
