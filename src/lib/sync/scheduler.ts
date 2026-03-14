/**
 * Cloud Tasks scheduler for sync jobs.
 * Manages creating, updating, and deleting scheduled sync tasks per vendor.
 */

import { CloudTasksClient } from "@google-cloud/tasks";
import { prisma } from "@/lib/db/client";

const client = new CloudTasksClient();

const PROJECT = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_TASKS_LOCATION ?? "us-central1";
const QUEUE = process.env.GCP_TASKS_QUEUE ?? "sync-jobs";
const SERVICE_URL = process.env.GCP_SYNC_SERVICE_URL!;
const SERVICE_ACCOUNT = process.env.CLOUD_TASKS_OIDC_SA!;

function getQueuePath(): string {
  return client.queuePath(PROJECT, LOCATION, QUEUE);
}

/**
 * Schedule or reschedule a periodic sync for a vendor.
 * Cloud Tasks doesn't natively support recurring tasks — we re-enqueue
 * the next task at the end of each sync run via /api/sync/run.
 */
export async function scheduleNextSync(
  vendorId: string,
  frequencyMinutes: number
): Promise<void> {
  const nextRunAt = new Date(Date.now() + frequencyMinutes * 60 * 1000);
  const scheduleTime = Math.floor(nextRunAt.getTime() / 1000);

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url: `${SERVICE_URL}/api/sync/run`,
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify({ vendorId, trigger: "SCHEDULED" })).toString("base64"),
      oidcToken: {
        serviceAccountEmail: SERVICE_ACCOUNT,
        audience: SERVICE_URL,
      },
    },
    scheduleTime: { seconds: scheduleTime },
  };

  const [createdTask] = await client.createTask({
    parent: getQueuePath(),
    task,
  });

  // Store task name so we can identify/cancel it later
  await prisma.syncConfig.upsert({
    where: { vendorId },
    update: {
      nextSyncAt: nextRunAt,
      cloudTaskName: createdTask.name ?? null,
    },
    create: {
      vendorId,
      frequencyMinutes,
      nextSyncAt: nextRunAt,
      cloudTaskName: createdTask.name ?? null,
      updatedAt: new Date(),
    },
  });
}

/**
 * Enqueue an immediate one-off sync task for a vendor (manual trigger).
 */
export async function enqueueImmediateSync(vendorId: string): Promise<void> {
  await client.createTask({
    parent: getQueuePath(),
    task: {
      httpRequest: {
        httpMethod: "POST" as const,
        url: `${SERVICE_URL}/api/sync/run`,
        headers: { "Content-Type": "application/json" },
        body: Buffer.from(JSON.stringify({ vendorId, trigger: "MANUAL" })).toString("base64"),
        oidcToken: {
          serviceAccountEmail: SERVICE_ACCOUNT,
          audience: SERVICE_URL,
        },
      },
    },
  });
}
