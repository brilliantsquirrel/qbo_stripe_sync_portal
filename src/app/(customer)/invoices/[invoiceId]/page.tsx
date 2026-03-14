import { requireCustomer } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/utils/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkButton, AnchorButton } from "@/components/shared/link-button";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const customer = await requireCustomer();
  const { invoiceId } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, customerId: customer.id },
    include: { lineItems: true, payments: { where: { status: "SUCCEEDED" } } },
  });

  if (!invoice) notFound();

  const canPay = invoice.status === "UNPAID" || invoice.status === "PARTIAL";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Invoice {invoice.invoiceNumber ? `#${invoice.invoiceNumber}` : ""}
        </h1>
        <Badge
          variant={
            invoice.status === "PAID"
              ? "default"
              : invoice.status === "VOID"
              ? "outline"
              : "destructive"
          }
        >
          {invoice.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Issued</span>
            <span>{new Date(invoice.issuedAt).toLocaleDateString()}</span>
          </div>
          {invoice.dueDate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Due</span>
              <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Total</span>
            <span>{formatMoney(invoice.amountTotal, invoice.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Paid</span>
            <span className="text-green-600">
              {formatMoney(invoice.amountPaid, invoice.currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Balance Due</span>
            <span className={invoice.amountDue > 0 ? "text-red-600" : ""}>
              {formatMoney(invoice.amountDue, invoice.currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {invoice.lineItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Line Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-right px-4 py-2">Qty</th>
                  <th className="text-right px-4 py-2">Unit Price</th>
                  <th className="text-right px-4 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                    <td className="px-4 py-2 text-right">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatMoney(item.amount, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        {canPay && (
          <LinkButton href={`/invoices/${invoice.id}/pay`}>
            Pay {formatMoney(invoice.amountDue, invoice.currency)}
          </LinkButton>
        )}
        {invoice.qboInvoiceId && (
          <AnchorButton
            href={`/api/invoices/${invoice.id}/download`}
            variant="outline"
            download={true}
          >
            Download PDF
          </AnchorButton>
        )}
      </div>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {invoice.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span className="text-gray-600">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <span className="font-medium text-green-600">
                  +{formatMoney(p.amount, p.currency)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
