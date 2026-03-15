import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { fetchQboCreditMemoPdf } from "@/lib/qbo/credit-memos";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const customer = await requireCustomer();
  const { id: creditMemoId } = await params;

  const memo = await prisma.creditMemo.findFirst({
    where: {
      id: creditMemoId,
      customerId: customer.id,
      vendorId: customer.vendorId,
    },
  });

  if (!memo) {
    return NextResponse.json({ error: "Credit memo not found" }, { status: 404 });
  }

  try {
    const pdf = await fetchQboCreditMemoPdf(customer.vendorId, memo.qboCreditMemoId);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="credit-memo-${memo.qboCreditMemoId}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
