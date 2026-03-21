/**
 * Core bidirectional sync engine.
 *
 * Flow per sync:
 *  1.   Pull QBO customers  → DB
 *  1.5  Push new DB customers (no stripeId) → Stripe
 *  1.7  Pull QBO items → DB (Products)
 *  1.8  Push new/updated Products → Stripe (Products + Prices)
 *  2.   Pull QBO invoices + Stripe invoices → DB
 *  2.5  Push new unpaid DB invoices (no stripeId) → Stripe (finalized, payable)
 *  2.6  Stripe-paid invoices → record Payment in DB + create QBO payment
 *  2.7  QBO-paid invoices with open Stripe invoice → paid_out_of_band + record Payment
 *  3.   Pull QBO credit memos → DB
 *  4.   Update usage record
 *  5.   Update sync config timestamp
 *  6.   Complete sync log
 */

import { prisma } from "@/lib/db/client";
import { SyncTrigger, SyncStatus } from "@prisma/client";
import { fetchQboInvoices, createQboPayment } from "@/lib/qbo/invoices";
import { fetchQboCustomers } from "@/lib/qbo/customers";
import { fetchQboCreditMemos } from "@/lib/qbo/credit-memos";
import { fetchQboItems } from "@/lib/qbo/items";
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

export async function syncVendor(
  vendorId: string,
  trigger: SyncTrigger
): Promise<SyncResult> {
  const syncLog = await prisma.syncLog.create({
    data: { vendorId, trigger, status: SyncStatus.RUNNING },
  });

  let recordsProcessed = 0;
  const errors: Array<{ entity: string; id: string; message: string }> = [];

  try {
    const vendor = await prisma.vendor.findUniqueOrThrow({
      where: { id: vendorId },
      include: { qboConnection: true, stripeConnection: true },
    });

    if (!vendor.qboConnection) throw new Error("Vendor missing QBO connection.");

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

      for (const c of qboCustomers) {
        try {
          const mapped = qboCustomerToDb(c, vendorId);
          if (!mapped.email) continue;
          await prisma.customer.upsert({
            where: { vendorId_email: { vendorId, email: mapped.email } },
            update: { qboCustomerId: mapped.qboCustomerId, name: mapped.name },
            create: mapped,
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({ entity: "customer", id: c.Id, message: String(err) });
        }
      }

      for (const c of stripeCustomers) {
        try {
          if (!c.email) continue;
          const mapped = stripeCustomerToDb(c, vendorId);
          await prisma.customer.upsert({
            where: { vendorId_email: { vendorId, email: mapped.email } },
            update: { stripeCustomerId: mapped.stripeCustomerId },
            create: mapped,
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({ entity: "customer", id: c.id, message: String(err) });
        }
      }
    } catch (err) {
      errors.push({ entity: "customers", id: "batch", message: String(err) });
    }

    // ── 1.5. Push new QBO customers → Stripe ────────────────────────────────
    if (stripe) {
      try {
        const unlinked = await prisma.customer.findMany({
          where: { vendorId, qboCustomerId: { not: null }, stripeCustomerId: null },
        });
        for (const customer of unlinked) {
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
            errors.push({ entity: "stripe_customer_create", id: customer.id, message: String(err) });
          }
        }
      } catch (err) {
        errors.push({ entity: "stripe_customer_push", id: "batch", message: String(err) });
      }
    }

    // ── 1.7. Pull QBO items → DB (Products) ──────────────────────────────────
    try {
      const qboItems = await fetchQboItems(vendorId);
      for (const item of qboItems) {
        try {
          const unitPrice = Math.round((item.UnitPrice ?? 0) * 100);
          await prisma.product.upsert({
            where: { vendorId_qboItemId: { vendorId, qboItemId: item.Id } },
            update: {
              name: item.Name,
              description: item.Description ?? null,
              unitPrice,
              active: item.Active,
              qboUpdatedAt: new Date(item.MetaData.LastUpdatedTime),
            },
            create: {
              vendorId,
              qboItemId: item.Id,
              name: item.Name,
              description: item.Description ?? null,
              unitPrice,
              active: item.Active,
              qboUpdatedAt: new Date(item.MetaData.LastUpdatedTime),
            },
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({ entity: "product", id: item.Id, message: String(err) });
        }
      }
    } catch (err) {
      errors.push({ entity: "products", id: "batch", message: String(err) });
    }

    // ── 1.8. Push new/updated Products → Stripe ──────────────────────────────
    if (stripe) {
      try {
        const products = await prisma.product.findMany({ where: { vendorId, active: true } });
        for (const product of products) {
          try {
            if (!product.stripeProductId) {
              // Create new Stripe Product + Price
              const sp = await stripe.products.create({
                name: product.name,
                ...(product.description ? { description: product.description } : {}),
                metadata: { qboItemId: product.qboItemId ?? "" },
              });
              let priceId: string | null = null;
              if (product.unitPrice > 0) {
                const price = await stripe.prices.create({
                  product: sp.id,
                  unit_amount: product.unitPrice,
                  currency: "usd",
                  billing_scheme: "per_unit",
                });
                priceId = price.id;
              }
              await prisma.product.update({
                where: { id: product.id },
                data: { stripeProductId: sp.id, stripePriceId: priceId },
              });
              recordsProcessed++;
            } else {
              // Sync name/description updates
              await stripe.products.update(product.stripeProductId, {
                name: product.name,
                ...(product.description ? { description: product.description } : {}),
              });
              // Handle price change: Stripe prices are immutable, so archive + recreate
              if (product.stripePriceId && product.unitPrice > 0) {
                const existing = await stripe.prices.retrieve(product.stripePriceId);
                if (existing.unit_amount !== product.unitPrice) {
                  await stripe.prices.update(product.stripePriceId, { active: false });
                  const newPrice = await stripe.prices.create({
                    product: product.stripeProductId,
                    unit_amount: product.unitPrice,
                    currency: "usd",
                    billing_scheme: "per_unit",
                  });
                  await prisma.product.update({
                    where: { id: product.id },
                    data: { stripePriceId: newPrice.id },
                  });
                  recordsProcessed++;
                }
              } else if (!product.stripePriceId && product.unitPrice > 0) {
                const price = await stripe.prices.create({
                  product: product.stripeProductId,
                  unit_amount: product.unitPrice,
                  currency: "usd",
                  billing_scheme: "per_unit",
                });
                await prisma.product.update({
                  where: { id: product.id },
                  data: { stripePriceId: price.id },
                });
                recordsProcessed++;
              }
            }
          } catch (err) {
            errors.push({ entity: "stripe_product", id: product.id, message: String(err) });
          }
        }
      } catch (err) {
        errors.push({ entity: "stripe_products", id: "batch", message: String(err) });
      }
    }

    // ── 2. Pull QBO invoices + Stripe invoices → DB ──────────────────────────
    let stripeInvoices: Stripe.Invoice[] = [];
    try {
      const [qboInvoices, fetchedStripeInvoices] = await Promise.all([
        fetchQboInvoices(vendorId),
        stripe
          ? stripe.invoices.list({ limit: 100 }).then((r) => r.data)
          : Promise.resolve([] as Stripe.Invoice[]),
      ]);
      stripeInvoices = fetchedStripeInvoices;

      for (const qboInvoice of qboInvoices) {
        try {
          const customer = await prisma.customer.findFirst({
            where: { vendorId, qboCustomerId: qboInvoice.CustomerRef.value },
          });
          if (!customer) continue;

          const mapped = qboInvoiceToDb(qboInvoice, vendorId, customer.id);

          // Primary lookup by QBO ID; fall back to invoice number to avoid duplicates
          let existing = await prisma.invoice.findFirst({
            where: { vendorId, qboInvoiceId: qboInvoice.Id },
          });
          if (!existing && qboInvoice.DocNumber) {
            existing = await prisma.invoice.findFirst({
              where: { vendorId, customerId: customer.id, invoiceNumber: qboInvoice.DocNumber },
            });
          }

          const resolution = resolveConflict(mapped.qboUpdatedAt, existing?.stripeUpdatedAt ?? null);
          if (resolution.winner === "qbo" || !existing) {
            if (existing) {
              await prisma.invoice.update({
                where: { id: existing.id },
                data: {
                  qboInvoiceId: mapped.qboInvoiceId,
                  status: mapped.status,
                  amountTotal: mapped.amountTotal,
                  amountPaid: mapped.amountPaid,
                  amountDue: mapped.amountDue,
                  dueDate: mapped.dueDate,
                  qboUpdatedAt: mapped.qboUpdatedAt,
                },
              });
            } else {
              await prisma.invoice.create({ data: mapped });
            }
            recordsProcessed++;
          } else if (existing && !existing.qboInvoiceId) {
            // QBO didn't win conflict resolution, but still write back the link
            await prisma.invoice.update({
              where: { id: existing.id },
              data: { qboInvoiceId: mapped.qboInvoiceId, qboUpdatedAt: mapped.qboUpdatedAt },
            });
          }
        } catch (err) {
          errors.push({ entity: "invoice", id: qboInvoice.Id, message: String(err) });
        }
      }

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

          // Primary lookup by Stripe ID
          let existing = await prisma.invoice.findFirst({
            where: { vendorId, stripeInvoiceId: stripeInvoice.id },
          });
          // Fallback 1: QBO invoice ID stored in Stripe metadata
          if (!existing && stripeInvoice.metadata?.qboInvoiceId) {
            existing = await prisma.invoice.findFirst({
              where: { vendorId, qboInvoiceId: stripeInvoice.metadata.qboInvoiceId },
            });
          }
          // Fallback 2: invoice number + customer
          if (!existing && stripeInvoice.number) {
            existing = await prisma.invoice.findFirst({
              where: { vendorId, customerId: customer.id, invoiceNumber: stripeInvoice.number },
            });
          }

          const resolution = resolveConflict(existing?.qboUpdatedAt ?? null, mapped.stripeUpdatedAt);
          if (resolution.winner === "stripe" || !existing) {
            if (existing) {
              await prisma.invoice.update({
                where: { id: existing.id },
                data: {
                  stripeInvoiceId: stripeInvoice.id,
                  status: mapped.status,
                  amountTotal: mapped.amountTotal,
                  amountPaid: mapped.amountPaid,
                  amountDue: mapped.amountDue,
                  stripeUpdatedAt: mapped.stripeUpdatedAt,
                },
              });
            } else {
              await prisma.invoice.create({ data: mapped });
            }
            recordsProcessed++;
          } else if (existing && !existing.stripeInvoiceId) {
            // Stripe didn't win conflict resolution, but still write back the link
            await prisma.invoice.update({
              where: { id: existing.id },
              data: { stripeInvoiceId: stripeInvoice.id, stripeUpdatedAt: mapped.stripeUpdatedAt },
            });
          }
        } catch (err) {
          errors.push({ entity: "invoice", id: stripeInvoice.id, message: String(err) });
        }
      }
    } catch (err) {
      errors.push({ entity: "invoices", id: "batch", message: String(err) });
    }

    // ── 2.5. Push unpaid QBO invoices → Stripe ───────────────────────────────
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
            if (!invoice.customer.stripeCustomerId) {
              errors.push({
                entity: "stripe_invoice_create",
                id: invoice.id,
                message: "Customer has no Stripe ID — skipping invoice push",
              });
              continue;
            }
            const daysUntilDue = invoice.dueDate
              ? Math.max(1, Math.round((invoice.dueDate.getTime() - Date.now()) / 86400000))
              : 30;
            const draft = await stripe.invoices.create({
              customer: invoice.customer.stripeCustomerId,
              collection_method: "send_invoice",
              days_until_due: daysUntilDue,
              metadata: { qboInvoiceId: invoice.qboInvoiceId! },
              ...(invoice.invoiceNumber ? { description: `Invoice #${invoice.invoiceNumber}` } : {}),
            });
            await stripe.invoiceItems.create({
              customer: invoice.customer.stripeCustomerId,
              invoice: draft.id,
              amount: invoice.amountDue,
              currency: invoice.currency,
              description: invoice.invoiceNumber
                ? `Invoice #${invoice.invoiceNumber}`
                : "Outstanding balance from QuickBooks",
            });
            const finalized = await stripe.invoices.finalizeInvoice(draft.id);
            await prisma.invoice.update({
              where: { id: invoice.id },
              data: { stripeInvoiceId: finalized.id, stripeUpdatedAt: new Date() },
            });
            recordsProcessed++;
          } catch (err) {
            errors.push({ entity: "stripe_invoice_create", id: invoice.id, message: String(err) });
          }
        }
      } catch (err) {
        errors.push({ entity: "stripe_invoice_push", id: "batch", message: String(err) });
      }
    }

    // ── 2.6. Stripe-paid invoices → record Payment in DB + push to QBO ───────
    // When a customer pays through Stripe, record the payment and write it back
    // to QBO so the invoice is marked paid in the accounting system.
    if (stripe) {
      try {
        for (const stripeInvoice of stripeInvoices) {
          if (stripeInvoice.status !== "paid") continue;
          try {
            const dbInvoice = await prisma.invoice.findFirst({
              where: { vendorId, stripeInvoiceId: stripeInvoice.id },
              include: { customer: true },
            });
            if (!dbInvoice) continue;

            // Deduplicate by stripe invoice ID — no payment_intent field in this SDK version
            const existingPayment = await prisma.payment.findFirst({
              where: { vendorId, invoiceId: dbInvoice.id, status: "SUCCEEDED" },
            });
            if (existingPayment) continue;

            const payment = await prisma.payment.create({
              data: {
                vendorId,
                invoiceId: dbInvoice.id,
                customerId: dbInvoice.customerId,
                amount: stripeInvoice.amount_paid,
                currency: stripeInvoice.currency,
                status: "SUCCEEDED",
                stripeUpdatedAt: new Date(),
              },
            });
            recordsProcessed++;

            if (dbInvoice.qboInvoiceId && dbInvoice.customer.qboCustomerId) {
              try {
                const paidAt = stripeInvoice.status_transitions?.paid_at;
                const txnDate = paidAt
                  ? new Date(paidAt * 1000).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0];
                const qboPayment = await createQboPayment(
                  vendorId,
                  dbInvoice.customer.qboCustomerId,
                  dbInvoice.qboInvoiceId,
                  stripeInvoice.amount_paid,
                  txnDate
                );
                await prisma.payment.update({
                  where: { id: payment.id },
                  data: { qboPaymentId: qboPayment.Id, qboUpdatedAt: new Date() },
                });
              } catch (qboErr) {
                errors.push({
                  entity: "qbo_payment_create",
                  id: dbInvoice.id,
                  message: String(qboErr),
                });
              }
            }
          } catch (err) {
            errors.push({ entity: "payment_stripe_to_qbo", id: stripeInvoice.id, message: String(err) });
          }
        }
      } catch (err) {
        errors.push({ entity: "payments_stripe_to_qbo", id: "batch", message: String(err) });
      }
    }

    // ── 2.7. QBO-paid invoices → mark Stripe invoice paid_out_of_band ────────
    // When QBO shows a payment received (e.g. check, bank transfer), mark the
    // corresponding Stripe invoice as paid out-of-band so the customer portal
    // reflects the correct status without processing another charge.
    if (stripe) {
      try {
        const qboPaid = await prisma.invoice.findMany({
          where: {
            vendorId,
            status: "PAID",
            qboInvoiceId: { not: null },
            stripeInvoiceId: { not: null },
          },
          include: { customer: true },
        });

        for (const invoice of qboPaid) {
          try {
            const existingPayment = await prisma.payment.findFirst({
              where: { vendorId, invoiceId: invoice.id, status: "SUCCEEDED" },
            });
            if (existingPayment) continue;

            let stripeInv: Stripe.Invoice;
            try {
              stripeInv = await stripe.invoices.retrieve(invoice.stripeInvoiceId!);
            } catch {
              continue;
            }
            if (stripeInv.status !== "open") continue;

            await stripe.invoices.pay(invoice.stripeInvoiceId!, { paid_out_of_band: true });
            await prisma.payment.create({
              data: {
                vendorId,
                invoiceId: invoice.id,
                customerId: invoice.customerId,
                amount: invoice.amountTotal,
                currency: invoice.currency,
                status: "SUCCEEDED",
                stripeUpdatedAt: new Date(),
              },
            });
            recordsProcessed++;
          } catch (err) {
            errors.push({ entity: "payment_qbo_to_stripe", id: invoice.id, message: String(err) });
          }
        }
      } catch (err) {
        errors.push({ entity: "payments_qbo_to_stripe", id: "batch", message: String(err) });
      }
    }

    // ── 2.8. QBO-paid invoices with no Stripe link → record Payment in DB ────
    // Invoices paid via check/ACH/bank transfer in QBO may never have been
    // pushed to Stripe, so steps 2.6 and 2.7 both skip them. Record a Payment
    // here so the DB stays consistent with QBO.
    try {
      const qboPaidNoStripe = await prisma.invoice.findMany({
        where: {
          vendorId,
          status: "PAID",
          qboInvoiceId: { not: null },
          stripeInvoiceId: null,
        },
      });

      for (const invoice of qboPaidNoStripe) {
        try {
          const existingPayment = await prisma.payment.findFirst({
            where: { vendorId, invoiceId: invoice.id, status: "SUCCEEDED" },
          });
          if (existingPayment) continue;

          await prisma.payment.create({
            data: {
              vendorId,
              invoiceId: invoice.id,
              customerId: invoice.customerId,
              amount: invoice.amountTotal,
              currency: invoice.currency,
              status: "SUCCEEDED",
              qboUpdatedAt: invoice.qboUpdatedAt ?? new Date(),
            },
          });
          recordsProcessed++;
        } catch (err) {
          errors.push({ entity: "payment_qbo_only", id: invoice.id, message: String(err) });
        }
      }
    } catch (err) {
      errors.push({ entity: "payments_qbo_only", id: "batch", message: String(err) });
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
            where: { vendorId_qboCreditMemoId: { vendorId, qboCreditMemoId: memo.Id } },
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
          errors.push({ entity: "credit_memo", id: memo.Id, message: String(err) });
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
      where: { id: `${vendorId}-${periodStart.toISOString().slice(0, 7)}` },
      update: { invoicesSynced: { increment: recordsProcessed } },
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
