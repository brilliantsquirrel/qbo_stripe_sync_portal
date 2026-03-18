import { getQboClient } from "@/lib/qbo/client";

export interface QboItem {
  Id: string;
  Name: string;
  FullyQualifiedName?: string;
  Description?: string;
  UnitPrice?: number;
  Active: boolean;
  Type: string; // Service, NonInventory, Inventory, Category, etc.
  MetaData: { LastUpdatedTime: string };
}

/**
 * Fetch all items (products/services) from QBO for a vendor.
 * Excludes Category items — those are just groupings, not sellable items.
 */
export async function fetchQboItems(vendorId: string): Promise<QboItem[]> {
  const qbo = await getQboClient(vendorId);

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (qbo as any).findItems(
      [{ field: "fetchAll", value: "true" }],
      (err: Error | null, result: { QueryResponse?: { Item?: QboItem[] } }) => {
        if (err) return reject(err);
        const items = result?.QueryResponse?.Item ?? [];
        resolve(items.filter((i) => i.Type !== "Category"));
      }
    );
  });
}
