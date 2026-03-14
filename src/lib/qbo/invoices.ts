import { getQboClient } from "@/lib/qbo/client";

export interface QboInvoice {
  Id: string;
  DocNumber?: string;
  TotalAmt: number;
  Balance: number;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: { value: string; name?: string };
  Line: QboLineItem[];
  MetaData: { LastUpdatedTime: string };
  sparse?: boolean;
}

export interface QboLineItem {
  Id?: string;
  Description?: string;
  Amount: number;
  DetailType: string;
  SalesItemLineDetail?: {
    Qty?: number;
    UnitPrice?: number;
    ItemRef?: { value: string; name?: string };
  };
}

/**
 * Fetch all invoices from QBO for a vendor (paginated).
 */
export async function fetchQboInvoices(vendorId: string): Promise<QboInvoice[]> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    qbo.findInvoices(
      [{ field: "fetchAll", value: "true" }],
      (err: Error | null, invoices: { QueryResponse?: { Invoice?: QboInvoice[] } }) => {
        if (err) return reject(err);
        resolve(invoices?.QueryResponse?.Invoice ?? []);
      }
    );
  });
}

/**
 * Fetch a single invoice PDF from QBO as a Buffer.
 */
export async function fetchQboInvoicePdf(
  vendorId: string,
  qboInvoiceId: string
): Promise<Buffer> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    qbo.getInvoicePdf(qboInvoiceId, (err: Error | null, pdf: Buffer) => {
      if (err) return reject(err);
      resolve(pdf);
    });
  });
}

/**
 * Create or update a payment in QBO against an invoice.
 */
export async function createQboPayment(
  vendorId: string,
  qboCustomerId: string,
  qboInvoiceId: string,
  amountCents: number,
  txnDate: string
): Promise<{ Id: string }> {
  const qbo = await getQboClient(vendorId);
  const amount = amountCents / 100;

  return new Promise((resolve, reject) => {
    qbo.createPayment(
      {
        CustomerRef: { value: qboCustomerId },
        TotalAmt: amount,
        TxnDate: txnDate,
        Line: [
          {
            Amount: amount,
            LinkedTxn: [{ TxnId: qboInvoiceId, TxnType: "Invoice" }],
          },
        ],
      },
      (err: Error | null, payment: { Id: string }) => {
        if (err) return reject(err);
        resolve(payment);
      }
    );
  });
}
