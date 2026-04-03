import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { GarmentCheckerClient } from "./garment-checker-client";

export default async function GarmentsPage() {
  const session = await getSession();
  const isSupplier = session.role !== "ADMIN" && session.supplierId;

  // Build garment filter based on role
  let garmentWhere = {};
  if (isSupplier) {
    // Get run IDs for this supplier, then filter garments by those
    const supplierRunIds = await prisma.productionRun.findMany({
      where: { supplierId: session.supplierId! },
      select: { id: true },
    });
    garmentWhere = { productionRunId: { in: supplierRunIds.map((r) => r.id) } };
  }

  const recentGarments = await prisma.garment.findMany({
    where: garmentWhere,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      color: { select: { name: true, hexValue: true } },
      productionRun: {
        select: {
          id: true,
          runCode: true,
          status: true,
          productName: true,
          supplier: { select: { name: true } },
          orderLine: { select: { product: true, order: { select: { orderRef: true } } } },
        },
      },
    },
  });

  // Get production runs for "register to run" dropdown
  const runs = await prisma.productionRun.findMany({
    where: isSupplier ? { supplierId: session.supplierId! } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      runCode: true,
      productName: true,
      quantity: true,
      unitsProduced: true,
      status: true,
    },
  });

  return (
    <GarmentCheckerClient
      recentGarments={JSON.parse(JSON.stringify(recentGarments))}
      productionRuns={runs}
      isAdmin={session.role === "ADMIN"}
      language={session.language ?? "en"}
    />
  );
}
