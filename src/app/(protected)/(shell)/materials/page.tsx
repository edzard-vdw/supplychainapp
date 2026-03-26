import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MaterialsPageClient } from "./materials-page-client";

export default async function MaterialsPage() {
  const session = await getSession();
  const isSupplier = session.role !== "ADMIN" && session.supplierId;

  const deliveries = await prisma.yarnDelivery.findMany({
    where: isSupplier ? { supplierId: session.supplierId! } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      lines: true,
    },
  });

  // Build yarn stock grouped by colour code, with individual lots
  type LotDetail = {
    lineId: number;
    lotNumber: string;
    deliveryRef: string;
    deliveryId: number;
    cones: number;
    totalKg: number;
    remainingKg: number;
    composition: string;
    yarnType: string;
  };

  type ColourStock = {
    colourCode: string;
    colourName: string;
    totalKg: number;
    remainingKg: number;
    totalCones: number;
    lots: LotDetail[];
  };

  const stockMap = new Map<string, ColourStock>();

  for (const delivery of deliveries) {
    for (const line of delivery.lines) {
      const existing = stockMap.get(line.colourCode) || {
        colourCode: line.colourCode,
        colourName: line.colourName || "",
        totalKg: 0,
        remainingKg: 0,
        totalCones: 0,
        lots: [],
      };

      const condWeight = line.condKg || line.netKg;
      existing.totalKg += condWeight;
      existing.remainingKg += line.remainingKg;
      existing.totalCones += line.cones;
      if (line.colourName && !existing.colourName) existing.colourName = line.colourName;

      existing.lots.push({
        lineId: line.id,
        lotNumber: line.lotNumber || "—",
        deliveryRef: delivery.deliveryNoteRef,
        deliveryId: delivery.id,
        cones: line.cones,
        totalKg: condWeight,
        remainingKg: line.remainingKg,
        composition: line.composition || "",
        yarnType: line.yarnType || "",
      });

      stockMap.set(line.colourCode, existing);
    }
  }

  const yarnStock = Array.from(stockMap.values()).sort((a, b) => a.colourCode.localeCompare(b.colourCode));

  return (
    <MaterialsPageClient
      yarnStock={JSON.parse(JSON.stringify(yarnStock))}
      deliveries={JSON.parse(JSON.stringify(deliveries))}
      supplierId={session.supplierId || null}
    />
  );
}
