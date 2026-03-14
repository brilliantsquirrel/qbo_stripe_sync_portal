/**
 * Field mappers between QBO, Stripe, and our canonical DB models.
 * Centralizing mappings here keeps the sync engine clean.
 */

import type { QboInvoice } from "@/lib/qbo/invoices";
import type { QboCustomer } from "@/lib/qbo/customers";
import type Stripe from "stripe";
import { InvoiceStatus } from "@prisma/client";

// ─── Invoice mappings ─────────────────────────────────────────────────────────

export function qboInvoiceToDb(invoice: QboInvoice, vendorId: string, customerId: string) {
  const amountTotal = Math.round(invoice.TotalAmt * 100);
  const amountPaid = Math.round((invoice.TotalAmt - invoice.Balance) * 100);
  const amountDue = Math.round(invoice.Balance * 100);

  let status: InvoiceStatus = "UNPAID";
  if (invoice.Balance <= 0) status = "PAID";
  else if (amountPaid > 0) status = "PARTIAL";

  return {
    vendorId,
    customerId,
    qboInvoiceId: invoice.Id,
    invoiceNumber: invoice.DocNumber,
    amountTotal,
    amountPaid,
    amountDue,
    status,
    currency: "usd",
    issuedAt: new Date(invoice.TxnDate),
    dueDate: invoice.DueDate ? new Date(invoice.DueDate) : undefined,
    qboUpdatedAt: new Date(invoice.MetaData.LastUpdatedTime),
  };
}

export function stripeInvoiceToDb(invoice: Stripe.Invoice, vendorId: string, customerId: string) {
  const amountTotal = invoice.amount_due;
  const amountPaid = invoice.amount_paid;
  const amountDue = invoice.amount_remaining;

  let status: InvoiceStatus = "UNPAID";
  if (invoice.status === "paid") status = "PAID";
  else if (invoice.status === "void") status = "VOID";
  else if (amountPaid > 0) status = "PARTIAL";

  return {
    vendorId,
    customerId,
    stripeInvoiceId: invoice.id,
    invoiceNumber: invoice.number ?? undefined,
    amountTotal,
    amountPaid,
    amountDue,
    status,
    currency: invoice.currency,
    issuedAt: new Date((invoice.created ?? 0) * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : undefined,
    stripeUpdatedAt: new Date((invoice.status_transitions?.finalized_at ?? invoice.created ?? 0) * 1000),
  };
}

// ─── Customer mappings ────────────────────────────────────────────────────────

export function qboCustomerToDb(customer: QboCustomer, vendorId: string) {
  return {
    vendorId,
    qboCustomerId: customer.Id,
    name: customer.DisplayName,
    email: customer.PrimaryEmailAddr?.Address ?? "",
    phone: customer.PrimaryPhone?.FreeFormNumber,
  };
}

export function stripeCustomerToDb(customer: Stripe.Customer, vendorId: string) {
  return {
    vendorId,
    stripeCustomerId: customer.id,
    name: customer.name ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? undefined,
  };
}
