export interface SyncLogEntry {
  id: string;
  vendorId: string;
  trigger: "SCHEDULED" | "MANUAL" | "WEBHOOK";
  status: "RUNNING" | "COMPLETED" | "FAILED";
  recordsProcessed: number;
  errors: Array<{ entity: string; id: string; message: string }> | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface SyncConfigData {
  frequencyMinutes: number;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
}
