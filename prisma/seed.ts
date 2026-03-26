import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("changeme", 12);

  // Seed admin user
  await prisma.user.upsert({
    where: { email: "admin@sheepinc.com" },
    update: {},
    create: {
      email: "admin@sheepinc.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin: admin@sheepinc.com / changeme");

  // Seed test supplier: Patagonia Wool Farm
  const supplier = await prisma.supplier.upsert({
    where: { name: "Patagonia Wool Farm" },
    update: {},
    create: {
      name: "Patagonia Wool Farm",
      type: "GROWER",
      country: "Argentina",
      contactName: "Carlos Mendez",
      contactEmail: "carlos@patagoniawool.com",
    },
  });

  // Seed supplier user
  await prisma.user.upsert({
    where: { email: "carlos@patagoniawool.com" },
    update: {},
    create: {
      email: "carlos@patagoniawool.com",
      name: "Carlos Mendez",
      password: hashedPassword,
      role: "SUPPLIER",
      supplierId: supplier.id,
    },
  });
  console.log("✅ Supplier: carlos@patagoniawool.com / changeme (Patagonia Wool Farm)");

  // Seed second supplier: Italia Knits
  const supplier2 = await prisma.supplier.upsert({
    where: { name: "Italia Knits" },
    update: {},
    create: {
      name: "Italia Knits",
      type: "KNITTER",
      country: "Italy",
      contactName: "Marco Rossi",
      contactEmail: "marco@italiaknits.com",
    },
  });

  await prisma.user.upsert({
    where: { email: "marco@italiaknits.com" },
    update: {},
    create: {
      email: "marco@italiaknits.com",
      name: "Marco Rossi",
      password: hashedPassword,
      role: "SUPPLIER",
      supplierId: supplier2.id,
    },
  });
  console.log("✅ Supplier: marco@italiaknits.com / changeme (Italia Knits)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
