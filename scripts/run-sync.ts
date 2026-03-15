/**
 * One-off sync script for local dev testing.
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/run-sync.ts
 */
import "dotenv/config";
import { syncVendor } from "../src/lib/sync/engine";
import { SyncTrigger } from "@prisma/client";
import { prisma } from "../src/lib/db/client";

async function main() {
  const vendors = await prisma.vendor.findMany({
    include: { qboConnection: true },
  });

  if (vendors.length === 0) {
    console.error("No vendors found. Run the seed first.");
    process.exit(1);
  }

  for (const vendor of vendors) {
    if (!vendor.qboConnection) {
      console.log(`⚠️  Skipping ${vendor.email} — no QBO connection`);
      continue;
    }

    console.log(`\n🔄 Syncing vendor: ${vendor.email} (${vendor.id})`);
    const result = await syncVendor(vendor.id, SyncTrigger.MANUAL);
    console.log(`✅ Done — ${result.recordsProcessed} records processed`);
    if (result.errors.length > 0) {
      console.warn(`⚠️  ${result.errors.length} errors:`);
      result.errors.forEach((e) =>
        console.warn(`   [${e.entity}:${e.id}] ${e.message}`)
      );
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
