/**
 * Utility helpers for enforcing multi-tenant data isolation.
 * Every DB query involving vendor-owned data MUST be scoped with a vendorId.
 */

import { prisma } from "@/lib/db/client";

/**
 * Verify that a customer belongs to the given vendor.
 * Throws if not found (prevents cross-tenant data access).
 */
export async function assertCustomerBelongsToVendor(
  customerId: string,
  vendorId: string
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, vendorId },
    select: { id: true },
  });
  if (!customer) {
    throw new Error("Customer not found or access denied.");
  }
}

/**
 * Verify that an invoice belongs to the given vendor.
 */
export async function assertInvoiceBelongsToVendor(
  invoiceId: string,
  vendorId: string
): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, vendorId },
    select: { id: true },
  });
  if (!invoice) {
    throw new Error("Invoice not found or access denied.");
  }
}
