import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await requireCustomer();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, customerId: customer.id, vendorId: customer.vendorId },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      amountTotal: true,
      amountPaid: true,
      amountDue: true,
      currency: true,
      issuedAt: true,
      dueDate: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}
