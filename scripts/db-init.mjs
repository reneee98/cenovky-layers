import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });

const prisma = new PrismaClient({ adapter });

const SETTINGS_SINGLETON_ID = 1;

const defaults = {
  id: SETTINGS_SINGLETON_ID,
  companyName: "Your Company",
  companyAddress: "Street 1, City",
  companyEmail: "hello@example.com",
  companyPhone: "+421900000000",
  defaultLanguage: "sk",
  defaultCurrency: "EUR",
  vatRate: new Prisma.Decimal(20),
  numberingYear: new Date().getFullYear(),
  numberingCounter: 0,
};

async function main() {
  const settings = await prisma.$transaction(async (tx) => {
    await tx.settings.deleteMany({
      where: {
        id: {
          not: SETTINGS_SINGLETON_ID,
        },
      },
    });

    return tx.settings.upsert({
      where: { id: SETTINGS_SINGLETON_ID },
      update: {},
      create: defaults,
    });
  });

  console.log("Settings initialized", {
    id: settings.id,
    defaultLanguage: settings.defaultLanguage,
    defaultCurrency: settings.defaultCurrency,
    vatRate: settings.vatRate.toString(),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
