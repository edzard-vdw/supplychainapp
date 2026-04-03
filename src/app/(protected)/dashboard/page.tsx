import { prisma } from "@/lib/db";
import { getSession, getSupplierFilter } from "@/lib/session";
import { HubView } from "./hub-view";

export default async function DashboardPage() {
  const session = await getSession();
  const supplierFilter = getSupplierFilter(session);

  const [orderCount, runCount, garmentCount, materialCount, taggedCount, activeRunCount, pendingRunCount, pendingOrders] = await Promise.all([
    prisma.order.count({ where: supplierFilter }),
    prisma.productionRun.count({ where: supplierFilter }),
    prisma.garment.count({ where: supplierFilter ? { productionRun: { is: supplierFilter } } : undefined }),
    prisma.materialColor.count({ where: { isActive: true } }),
    prisma.garment.count({ where: supplierFilter ? { isTagged: true, productionRun: { is: supplierFilter } } : { isTagged: true } }),
    prisma.productionRun.count({ where: { status: "IN_PRODUCTION", ...supplierFilter } }),
    prisma.productionRun.count({ where: { status: "PLANNED", ...supplierFilter } }),
    // Orders awaiting supplier acknowledgment
    session.supplierId
      ? prisma.order.count({ where: { supplierId: session.supplierId, status: "CONFIRMED" } })
      : Promise.resolve(0),
  ]);

  return (
    <HubView
      user={{
        name: session.name,
        role: session.role,
        supplierId: session.supplierId,
        supplierName: session.supplierName,
      }}
      stats={{ orderCount, runCount, garmentCount, materialCount, taggedCount, activeRunCount, pendingRunCount, pendingOrders }}
      language={session.language ?? "en"}
    />
  );
}
