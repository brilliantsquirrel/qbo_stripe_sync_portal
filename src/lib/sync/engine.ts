/**
 * Core bidirectional sync engine.
 * Orchestrates fetching from QBO and Stripe, resolving conflicts,
 * and writing canonical records to the DB.
 *
 * Flow per sync:
 *  1.   Pull QBO customers  → DB
 *  1.5  Push new DB customers (no stripeId) → Stripe
 *  2.   Pull QBO invoices   → DB
 *       Pull Stripe invoices → DB
 *  2.5  Push new unpaid DB invoices (no stripeId) → Stripe (finalized, payable)
 *  3.   Pull QBO credit memos → DB
 *  4.   Update usage record
 *  5.   Update sync config timestamp
 *  6.   Complete sync log
 */

import { prisma } from "@/lib/db/client";
import { SyncTrigger, SyncStatus } from "@prisma/client";
import { fetchQboInvoices } from "@/lib/qbo/invoices";
import { fetchQboCustomers } from "@/lib/qbo/customers";
import { fetchQboCreditMemos } from "@/lib/qbo/credit-memos";
import { getVendorStripe } from "@/lib/stripe/client";
import { resolveConflict } from "@/lib/sync/resolver";
import {
  qboInvoiceToDb,
  stripeInvoiceToDb,
  qboCustomerToDb,
  stripeCustomerToDb,
} from "@/lib/sync/mapper";
import type Stripe from "stripe";

interface SyncResult {
  syncLogId: string;
  recordsProcessed: number;
  errors: Array<{ entity: string; id: string; message: string }>;
}

/**
 * Run a full bidirectional sync for a vendor.
 * Called by Cloud Tasks (/api/sync/run) or manual trigger (/api/sync/trigger).
 */
export async function syncVendor(
  vendorId: string,
  trigger: SyncTrigger
): Promise<SyncResult> {
  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: { vendorId, trigger, status: SyncStatus.RUNNING },
  });

  let recordsProcessed = 0;
  const errors: Array<{ entity: string; id: string; message: string }> = [];

  try {
    // Check connections exist
    const vendor = await prisma.vendor.findUniqueOrThrow({
      where: { id: vendorId },
      include: { qboConnection: true, stripeConnection: true },
    });

    if (!vendor.qboConnection) {
      throw new Error("Vendor missing QBO connection.");
    }

    const stripe: Stripe | null = vendor.stripeConnection
      ? await getVendorStripe(vendorId)
      : null;

    // ── 1. Pull QBO customers → DB ───────────────────────────────────────────
    try {
      const [qboCustomers, stripeCustomers] = await Promise.all([
        fetchQboCustomers(vendorId),
        stripe
          ? stripe.customers.list({ limit: 100 }).then((r) => r.data)
          : Promise.resolve([] as Stripe.Customer[]),
      ]);

      for (const qboCustomer of qboCustomers) {
        try {
          const mapped = qboCustomerToDb(qboCustomer, vendorId);
          if (!mapped.email) continue; // skip customers without email

          await prisma.customer.upsert({
            where: { vendorId_email: { vendorId, email: mapped.email } },
            update: { qboCustomerId: mapped.qboCustomerId, name: mapped.name },
            create: mapped,
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({
            entity: "customer",
            id: qboCustomer.Id,
            message: String(err),
          });
        }
      }

      for (const stripeCustomer of stripeCustomers) {
        try {
          if (!stripeCustomer.email) continue;
          const mapped = stripeCustomerToDb(stripeCustomer, vendorId);
          await prisma.customer.upsert({
            where: { vendorId_email: { vendorId, email: mapped.email } },
            update: { stripeCustomerId: mapped.stripeCustomerId },
            create: mapped,
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({
            entity: "customer",
            id: stripeCustomer.id,
            message: String(err),
          });
        }
      }
    } catch (err) {
      errors.push({ entity: "customers", id: "batch", message: String(err) });
    }

    // ── 1.5. Push new QBO customers → Stripe ────────────────────────────────
    // For every customer with a QBO ID but no Stripe ID, create them in Stripe
    // so they can later be attached to Stripe invoices.
    if (stripe) {
      try {
        const unlinkedCustomers = await prisma.customer.findMany({
          where: {
            vendorId,
            qboCustomerId: { not: null },
            stripeCustomerId: null,
          },
        });

        for (const customer of unlinkedCustomers) {
          try {
            const sc = await stripe.customers.create({
              name: customer.name,
              email: customer.email,
              metadata: { qboCustomerId: customer.qboCustomerId! },
            });
            await prisma.customer.update({
              where: { id: customer.id },
              data: { stripeCustomerId: sc.id },
            });
            recordsProcessed++;
          } catch (err) {
            errors.push({
              entity: "stripe_customer_create",
              id: customer.id,
              message: String(err),
            });
          }
        }
      } catch (err) {
        errors.push({
          entity: "stripe_customer_push",
          id: "batch",
          message: String(err),
        });
      }
    }

    // ── 2. Pull QBO invoices + Stripe invoices → DB ──────────────────────────
    try {
      const [qboInvoices, stripeInvoices] = await Promise.all([
        fetchQboInvoices(vendorId),
        stripe
          ? stripe.invoices.list({ limit: 100 }).then((r) => r.data)
          : Promise.resolve([] as Stripe.Invoice[]),
      ]);

      // Process QBO invoices
      for (const qboInvoice of qboInvoices) {
        try {
          const customer = await prisma.customer.findFirst({
            where: {
              vendorId,
              qboCustomerId: qboInvoice.CustomerRef.value,
            },
          });
          if (!customer) continue;

          const mapped = qboInvoiceToDb(qboInvoice, vendorId, customer.id);

          // Check if this invoice exists in Stripe too
          const existing = await prisma.invoice.findFirst({
            where: { vendorId, qboInvoiceId: qboInvoice.Id },
          });

          const stripeUpdatedAt = existing?.stripeUpdatedAt ?? null;
          const resolution = resolveConflict(mapped.qboUpdatedAt, stripeUpdatedAt);

          if (resolution.winner === "qbo" || !existing) {
            await prisma.invoice.upsert({
              where: existing
                ? { id: existing.id }
                : {
                    vendorId_qboInvoiceId: {
                      vendorId,
                      qboInvoiceId: qboInvoice.Id,
                    },
                  },
              update: {
                status: mapped.status,
                amountTotal: mapped.amountTotal,
                amountPaid: mapped.amountPaid,
                amountDue: mapped.amountDue,
                dueDate: mapped.dueDate,
                qboUpdatedAt: mapped.qboUpdatedAt,
              },
              create: mapped,
            });
            recordsProcessed++;
          }
        } catch (err) {
          errors.push({
            entity: "invoice",
            id: qboInvoice.Id,
            message: String(err),
          });
        }
      }

      // Process Stripe invoices
      for (const stripeInvoice of stripeInvoices) {
        try {
          if (!stripeInvoice.customer) continue;

          const stripeCustomerId =
            typeof stripeInvoice.customer === "string"
              ? stripeInvoice.customer
              : stripeInvoice.customer.id;

          const customer = await prisma.customer.findFirst({
            where: { vendorId, stripeCustomerId },
          });
          if (!customer) continue;

          const mapped = stripeInvoiceToDb(stripeInvoice, vendorId, customer.id);
          const existing = await prisma.invoice.findFirst({
            where: { vendorId, stripeInvoiceId: stripeInvoice.id },
          });

          const qboUpdatedAt = existing?.qboUpdatedAt ?? null;
          const resolution = resolveConflict(qboUpdatedAt, mapped.stripeUpdatedAt);

          if (resolution.winner === "stripe" || !existing) {
            await prisma.invoice.upsert({
              where: existing
                ? { id: existing.id }
                : {
                    vendorId_stripeInvoiceId: {
                      vendorId,
                      stripeInvoiceId: stripeInvoice.id,
                    },
                  },
              update: {
                status: mapped.status,
                amountTotal: mapped.amountTotal,
                amountPaid: mapped.amountPaid,
                amountDue: mapped.amountDue,
                stripeUpdatedAt: mapped.stripeUpdatedAt,
              },
              create: mapped,
            });
            recordsProcessed++;
          }
        } catch (err) {
          errors.push({
            entity: "invoice",
            id: stripeInvoice.id,
            message: String(err),
          });
        }
      }
    } catch (err) {
      errors.push({ entity: "invoices", id: "batch", message: String(err) });
    }

    // ── 2.5. Push unpaid QBO invoices → Stripe ───────────────────────────────
    // For every open invoice with a QBO ID but no Stripe ID, create a finalized
    // Stripe invoice so the customer can pay through the portal.
    if (stripe) {
      try {
        const unlinkedInvoices = await prisma.invoice.findMany({
          where: {
            vendorId,
            qboInvoiceId: { not: null },
            stripeInvoiceId: null,
            status: { in: ["UNPAID", "PARTIAL"] },
            amountDue: { gt: 0 },
          },
          include: { customer: true },
        });

        for (const invoice of unlinkedInvoices) {
          try {
            // Customer must be in Stripe first (step 1.5 should have handled this)
            if (!invoice.customer.stripeCustomerId) {
              errors.push({
                entity: "stripe_invoice_create",
                id: invoice.id,
                message: "Customer has no Stripe ID — skipping invoice push",
              });
              continue;
            }

            // Days until due (minimum 1 to satisfy Stripe)
            const daysUntilDue = invoice.dueDate
              ? Math.max(1, Math.round((invoice.dueDate.getTime() - Date.now()) / 86400000))
              : 30;

            // 1. Create draft invoice
            const draftInvoice = await stripe.invoices.create({
              customer: invoice.customer.stripeCustomerId,
              collection_method: "send_invoice",
              days_until_due: daysUntilDue,
              metadata: { qboInvoiceId: invoice.qboInvoiceId! },
              ...(invoice.invoiceNumber
                ? { description: `Invoice #${invoice.invoiceNumber}` }
                : {}),
            });

            // 2. Add line item (the outstanding balance)
            await stripe.invoiceItems.create({
              customer: invoice.customer.stripeCustomerId,
              invoice: draftInvoice.id,
              amount: invoice.amountDue,
              currency: invoice.currency,
              description: invoice.invoiceNumber
                ? `Invoice #${invoice.invoiceNumber}`
                : "Outstanding balance from QuickBooks",
            });

            // 3. Finalize → moves draft → open (payable via hosted invoice page)
            const finalized = await stripe.invoices.finalizeInvoice(draftInvoice.id);

            // 4. Record the Stripe invoice ID in our DB
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                stripeInvoiceId: finalized.id,
                stripeUpdatedAt: new Date(),
              },
            });

            recordsProcessed++;
          } catch (err) {
            errors.push({
              entity: "stripe_invoice_create",
              id: invoice.id,
              message: String(err),
            });
          }
        }
      } catch (err) {
        errors.push({
          entity: "stripe_invoice_push",
          id: "batch",
          message: String(err),
        });
      }
    }

    // ── 3. Pull QBO credit memos → DB ────────────────────────────────────────
    try {
      const creditMemos = await fetchQboCreditMemos(vendorId);
      for (const memo of creditMemos) {
        try {
          const customer = await prisma.customer.findFirst({
            where: { vendorId, qboCustomerId: memo.CustomerRef.value },
          });
          if (!customer) continue;

          await prisma.creditMemo.upsert({
            where: {
              vendorId_qboCreditMemoId: {
                vendorId,
                qboCreditMemoId: memo.Id,
              },
            },
            update: {
              amount: Math.round(memo.TotalAmt * 100),
              remainingCredit: Math.round(memo.Balance * 100),
              qboUpdatedAt: new Date(memo.MetaData.LastUpdatedTime),
            },
            create: {
              vendorId,
              customerId: customer.id,
              qboCreditMemoId: memo.Id,
              amount: Math.round(memo.TotalAmt * 100),
              remainingCredit: Math.round(memo.Balance * 100),
              issuedAt: new Date(memo.TxnDate),
              qboUpdatedAt: new Date(memo.MetaData.LastUpdatedTime),
            },
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({
            entity: "credit_memo",
            id: memo.Id,
            message: String(err),
          });
        }
      }
    } catch (err) {
      errors.push({ entity: "credit_memos", id: "batch", message: String(err) });
    }

    // ── 4. Update usage record ────────────────────────────────────────────────
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await prisma.usageRecord.upsert({
      where: {
        id: `${vendorId}-${periodStart.toISOString().slice(0, 7)}`,
      },
      update: {
        invoicesSynced: { increment: recordsProcessed },
      },
      create: {
        id: `${vendorId}-${periodStart.toISOString().slice(0, 7)}`,
        vendorId,
        periodStart,
        periodEnd,
        invoicesSynced: recordsProcessed,
      },
    });

    // ── 5. Update sync config ─────────────────────────────────────────────────
    await prisma.syncConfig.upsert({
      where: { vendorId },
      update: { lastSyncAt: now },
      create: { vendorId, lastSyncAt: now, updatedAt: now },
    });

    // ── 6. Complete sync log ──────────────────────────────────────────────────
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        // PARTIAL status requires the migration: npx prisma migrate dev --name add_partial_sync_status
        // Until then all non-fatal syncs log as COMPLETED; partial failures are still in errors field.
        status: SyncStatus.COMPLETED,
        recordsProcessed,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    });

    return { syncLogId: syncLog.id, recordsProcessed, errors };
  } catch (fatalError) {
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: SyncStatus.FAILED,
        errors: [{ entity: "sync", id: "fatal", message: String(fatalError) }],
        completedAt: new Date(),
      },
    });
    throw fatalError;
  }
}
