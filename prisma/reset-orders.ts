/**
 * reset-orders.ts
 * Clears all orders, order lines, production runs, garments and related data
 * so you can test the full PO → production → shipping flow from scratch.
 * Keeps: Users, Suppliers, MaterialColors, YarnDeliveries, impact records, settings.
 *
 * Run with: npx tsx prisma/reset-orders.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑  Resetting orders and production data...\n");

  // 1. Scan events (reference garments)
  const scanEvents = await prisma.scanEvent.deleteMany({});
  console.log(`  Deleted ${scanEvents.count} scan events`);

  // 2. QR change log (references garments)
  const qrLogs = await prisma.qrChangeLog.deleteMany({});
  console.log(`  Deleted ${qrLogs.count} QR change log entries`);

  // 3. Garments (reference production runs)
  const garments = await prisma.garment.deleteMany({});
  console.log(`  Deleted ${garments.count} garments`);

  // 4. Run size breakdowns (cascade from production runs, but delete explicitly)
  const sizeBreakdowns = await prisma.runSizeBreakdown.deleteMany({});
  console.log(`  Deleted ${sizeBreakdowns.count} size breakdown rows`);

  // 5. Yarn compositions
  const yarnComps = await prisma.yarnComposition.deleteMany({});
  console.log(`  Deleted ${yarnComps.count} yarn compositions`);

  // 6. Supplier impacts linked to production runs
  const impacts = await prisma.supplierImpact.deleteMany({
    where: { productionRunId: { not: null } },
  });
  console.log(`  Deleted ${impacts.count} run-level impact records`);

  // 7. Production runs
  const runs = await prisma.productionRun.deleteMany({});
  console.log(`  Deleted ${runs.count} production runs`);

  // 8. Edit log
  const editLogs = await prisma.editLog.deleteMany({});
  console.log(`  Deleted ${editLogs.count} edit log entries`);

  // 9. Order lines (cascade from orders, but delete explicitly)
  const lines = await prisma.orderLine.deleteMany({});
  console.log(`  Deleted ${lines.count} order lines`);

  // 10. Orders
  const orders = await prisma.order.deleteMany({});
  console.log(`  Deleted ${orders.count} orders`);

  console.log("\n✅ Done — database is clean. Ready to test the full flow.");
  console.log("   Admin:    admin@sheepinc.com / changeme");
  console.log("   Supplier: carlos@patagoniawool.com / changeme  (Patagonia Wool Farm)");
  console.log("   Supplier: marco@italiaknits.com / changeme     (Italia Knits)");
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
