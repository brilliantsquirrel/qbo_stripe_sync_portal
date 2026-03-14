import { getQboClient } from "@/lib/qbo/client";

export interface QboCreditMemo {
  Id: string;
  DocNumber?: string;
  TotalAmt: number;
  Balance: number;
  TxnDate: string;
  CustomerRef: { value: string; name?: string };
  MetaData: { LastUpdatedTime: string };
}

/**
 * Fetch all credit memos from QBO for a vendor.
 */
export async function fetchQboCreditMemos(vendorId: string): Promise<QboCreditMemo[]> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    qbo.findCreditMemos(
      [{ field: "fetchAll", value: "true" }],
      (err: Error | null, result: { QueryResponse?: { CreditMemo?: QboCreditMemo[] } }) => {
        if (err) return reject(err);
        resolve(result?.QueryResponse?.CreditMemo ?? []);
      }
    );
  });
}

/**
 * Fetch a credit memo PDF from QBO as a Buffer.
 */
export async function fetchQboCreditMemoPdf(
  vendorId: string,
  qboCreditMemoId: string
): Promise<Buffer> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    qbo.getCreditMemoPdf(qboCreditMemoId, (err: Error | null, pdf: Buffer) => {
      if (err) return reject(err);
      resolve(pdf);
    });
  });
}
