import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { fetchQboInvoicePdf } from "@/lib/qbo/invoices";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await requireCustomer();
  const { id: invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, customerId: customer.id, vendorId: customer.vendorId },
  });

  if (!invoice || !invoice.qboInvoiceId) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  try {
    const pdf = await fetchQboInvoicePdf(customer.vendorId, invoice.qboInvoiceId);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber ?? invoiceId}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
