import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "admin@brilliantsquirrel.com";
  const password = "changeme123!";

  const passwordHash = await bcrypt.hash(password, 12);

  const vendor = await prisma.vendor.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Brilliant Squirrel",
      passwordHash,
      role: "VENDOR",
      syncConfig: {
        create: {
          frequencyMinutes: 60,
        },
      },
    },
  });

  console.log(`✅ Vendor seeded: ${vendor.email} (id: ${vendor.id})`);
  console.log(`   Password: ${password}`);
  console.log(`   Login at: http://localhost:3000/admin-login`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
