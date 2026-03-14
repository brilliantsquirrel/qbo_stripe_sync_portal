import { getQboClient } from "@/lib/qbo/client";

export interface QboCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  MetaData: { LastUpdatedTime: string };
}

/**
 * Fetch all customers from QBO for a vendor.
 */
export async function fetchQboCustomers(vendorId: string): Promise<QboCustomer[]> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    qbo.findCustomers(
      [{ field: "fetchAll", value: "true" }],
      (err: Error | null, result: { QueryResponse?: { Customer?: QboCustomer[] } }) => {
        if (err) return reject(err);
        resolve(result?.QueryResponse?.Customer ?? []);
      }
    );
  });
}
