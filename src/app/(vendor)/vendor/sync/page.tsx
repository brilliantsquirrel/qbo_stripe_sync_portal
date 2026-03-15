"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  recordsProcessed?: number;
  errors?: Array<{ entity: string; id: string; message: string }>;
  error?: string;
}

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

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchLogs() {
    const res = await fetch("/api/vendor/sync-logs");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
    }
  }

  async function triggerSync() {
    setTriggering(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/sync/trigger", { method: "POST" });
      let result: SyncResult = { success: false };
      try {
        result = await res.json();
      } catch {
        result = { success: false, error: `Server error ${res.status}` };
      }
      setLastResult(result);
      // Refresh logs immediately — sync already completed inline in dev
      await fetchLogs();
    } catch (err) {
      setLastResult({ success: false, error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sync Status</h1>
        <Button onClick={triggerSync} disabled={triggering}>
          {triggering ? "Syncing…" : "Sync Now"}
        </Button>
      </div>

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
