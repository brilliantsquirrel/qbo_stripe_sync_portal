"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

interface SyncLog {
  id: string;
  trigger: string;
  status: string;
  recordsProcessed: number;
  startedAt: string;
  completedAt: string | null;
  errors: Array<{ entity: string; id: string; message: string }> | null;
}

interface SyncResult {
  success: boolean;
  queued?: boolean;
  recordsProcessed?: number;
  errors?: Array<{ entity: string; id: string; message: string }>;
  error?: string;
}

interface SyncConfig {
  frequencyHours: number;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
}

const FREQUENCY_OPTIONS = [
  { label: "Every hour", value: 1 },
  { label: "Every 2 hours", value: 2 },
  { label: "Every 4 hours", value: 4 },
  { label: "Every 6 hours", value: 6 },
  { label: "Every 12 hours", value: 12 },
  { label: "Every 24 hours", value: 24 },
  { label: "Every 48 hours", value: 48 },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "PARTIAL") return "secondary";
  if (status === "RUNNING") return "outline";
  return "destructive";
}

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [clearingInvoices, setClearingInvoices] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: number; voided: number } | null>(null);

  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ frequencyHours: 1, lastSyncAt: null, nextSyncAt: null });
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Used to detect sync completion when the trigger is queued (production)
  const pollingSinceRef = useRef<Date | null>(null);

  useEffect(() => {
    fetchLogs();
    fetchConfig();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchConfig() {
    const res = await fetch("/api/vendor/sync-config");
    if (res.ok) {
      const data = await res.json();
      setSyncConfig(data);
    }
  }

  async function saveConfig() {
    setSavingConfig(true);
    setConfigSaved(false);
    try {
      const res = await fetch("/api/vendor/sync-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequencyHours: syncConfig.frequencyHours }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncConfig(data);
        setConfigSaved(true);
      }
    } finally {
      setSavingConfig(false);
    }
  }

  async function fetchLogs() {
    const res = await fetch("/api/vendor/sync-logs");
    if (!res.ok) return;
    const data = await res.json();
    setLogs(data.logs);

    // If we triggered a queued sync, poll until it completes
    if (pollingSinceRef.current) {
      const since = pollingSinceRef.current;
      const completed = (data.logs as SyncLog[]).find(
        (log) => log.status !== "RUNNING" && new Date(log.startedAt) >= since
      );
      if (completed) {
        pollingSinceRef.current = null;
        setTriggering(false);
        setLastResult({
          success: completed.status === "COMPLETED" || completed.status === "PARTIAL",
          recordsProcessed: completed.recordsProcessed,
          errors: completed.errors ?? undefined,
          error: completed.status === "FAILED" ? "Sync failed — check logs below" : undefined,
        });
      }
    }
  }

  async function clearStripeInvoices() {
    if (!confirm("This will delete all draft invoices and void all open invoices in Stripe. Continue?")) return;
    setClearingInvoices(true);
    setClearResult(null);
    try {
      const res = await fetch("/api/vendor/stripe-invoices", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) setClearResult(data);
    } finally {
      setClearingInvoices(false);
    }
  }

  async function triggerSync() {
    setTriggering(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      let result: SyncResult;
      try {
        result = await res.json();
      } catch {
        result = { success: false, error: `Server error ${res.status}` };
      }

      if (res.status === 409) {
        setLastResult({ success: false, error: "A sync is already running — wait for it to finish." });
        setTriggering(false);
        return;
      }

      if (!res.ok) {
        setLastResult({ success: false, error: result.error ?? `Server error ${res.status}` });
        setTriggering(false);
        return;
      }

      if (result.queued) {
        // Production: sync was enqueued — poll fetchLogs until a completed entry appears
        pollingSinceRef.current = new Date();
        await fetchLogs();
        // triggering stays true until pollingSinceRef is cleared by fetchLogs
      } else {
        // Development: sync ran inline and returned full results
        setLastResult(result);
        await fetchLogs();
        setTriggering(false);
      }
    } catch (err) {
      setLastResult({ success: false, error: err instanceof Error ? err.message : "Network error" });
      setTriggering(false);
    }
  }

  const syncRunning = triggering || logs.some((l) => l.status === "RUNNING");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sync Status</h1>
        <div className="flex gap-3">
          <Button variant="destructive" onClick={clearStripeInvoices} disabled={clearingInvoices}>
            {clearingInvoices ? "Clearing…" : "Delete Unpaid Stripe Invoices"}
          </Button>
          <Button onClick={triggerSync} disabled={syncRunning}>
            {syncRunning ? "Syncing…" : "Sync Now"}
          </Button>
        </div>
      </div>

      {clearResult && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Cleared Stripe invoices — <strong>{clearResult.deleted} deleted</strong>, <strong>{clearResult.voided} voided</strong>.
        </div>
      )}

      {/* Pending banner while waiting for queued sync */}
      {triggering && !lastResult && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          ⏳ Sync in progress — waiting for results…
        </div>
      )}

      {/* Result banner */}
      {lastResult && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            lastResult.success
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {lastResult.success ? (
            <>
              ✅ Sync complete —{" "}
              <strong>{lastResult.recordsProcessed ?? 0} records</strong> processed.
              {lastResult.errors && lastResult.errors.length > 0 && (
                <span className="ml-2 text-amber-700">
                  ({lastResult.errors.length} warning{lastResult.errors.length !== 1 ? "s" : ""})
                </span>
              )}
            </>
          ) : (
            <>❌ Sync failed: {lastResult.error ?? "Unknown error"}</>
          )}
        </div>
      )}

      {/* Warnings detail */}
      {lastResult?.success && lastResult.errors && lastResult.errors.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-800">Sync Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-xs text-amber-700 font-mono">
              {lastResult.errors.map((e, i) => (
                <li key={i}>[{e.entity}:{e.id}] {e.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Automatic sync settings */}
      <Card>
        <CardHeader>
          <CardTitle>Automatic Sync</CardTitle>
          <CardDescription>Configure how often syncs run automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="frequencyHours">Sync frequency</Label>
              <select
                id="frequencyHours"
                value={syncConfig.frequencyHours}
                onChange={(e) => {
                  setSyncConfig((c) => ({ ...c, frequencyHours: Number(e.target.value) }));
                  setConfigSaved(false);
                }}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Button onClick={saveConfig} disabled={savingConfig}>
              {savingConfig ? "Saving…" : "Save"}
            </Button>
          </div>
          {configSaved && <p className="text-sm text-green-600">Sync frequency saved.</p>}
          <div className="text-sm text-gray-500 space-y-1">
            {syncConfig.lastSyncAt && (
              <p>Last sync: {new Date(syncConfig.lastSyncAt).toLocaleString()}</p>
            )}
            {syncConfig.nextSyncAt && (
              <p>Next sync: {new Date(syncConfig.nextSyncAt).toLocaleString()}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Started</th>
                <th className="text-left px-4 py-3 font-medium">Trigger</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Records</th>
                <th className="text-right px-4 py-3 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const duration = log.completedAt
                  ? Math.round(
                      (new Date(log.completedAt).getTime() -
                        new Date(log.startedAt).getTime()) /
                        1000
                    )
                  : null;
                return (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {new Date(log.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{log.trigger}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(log.status)}>
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{log.recordsProcessed}</td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {duration !== null ? `${duration}s` : "—"}
                    </td>
                  </tr>
                );
              })}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No sync runs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
