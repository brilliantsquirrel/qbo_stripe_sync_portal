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

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [triggering, setTriggering] = useState(false);
  const [lastTriggeredAt, setLastTriggeredAt] = useState<Date | null>(null);

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
    try {
      await fetch("/api/sync/trigger", { method: "POST" });
      setLastTriggeredAt(new Date());
      setTimeout(fetchLogs, 2000);
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sync Status</h1>
        <div className="flex items-center gap-3">
          {lastTriggeredAt && (
            <span className="text-sm text-gray-500">
              Triggered at {lastTriggeredAt.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={triggerSync} disabled={triggering}>
            {triggering ? "Queuing…" : "Sync Now"}
          </Button>
        </div>
      </div>

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
                      <Badge
                        variant={
                          log.status === "COMPLETED"
                            ? "default"
                            : log.status === "RUNNING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
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
