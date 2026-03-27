import { prisma } from "@/lib/db";
import { getSession, getSupplierFilter } from "@/lib/session";
import { ProductionRunsClient } from "./production-runs-client";

export default async function ProductionRunsPage({ searchParams }: { searchParams: Promise<{ orderLineId?: string; create?: string; product?: string; sku?: string; size?: string; qty?: string }> }) {
  const session = await getSession();
  const params = await searchParams;
  const supplierFilter = getSupplierFilter(session);
  const orderLineId = params.orderLineId ? parseInt(params.orderLineId) : undefined;
  const isSupplier = session.role !== "ADMIN" && session.supplierId;

  const [runs, suppliers, yarnLots] = await Promise.all([
    prisma.productionRun.findMany({
      where: { ...supplierFilter, ...(orderLineId ? { orderLineId } : {}) },
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true } },
        order: { select: { orderRef: true } },
        orderLine: { select: { id: true, product: true, size: true, order: { select: { orderRef: true } }, color: { select: { name: true, hexValue: true } } } },
        sizeBreakdown: { orderBy: { size: "asc" } },
        yarnCompositions: true,
        _count: { select: { garments: true } },
      },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    // Get available yarn lots from deliveries
    prisma.yarnDeliveryLine.findMany({
      where: {
        remainingKg: { gt: 0 },
        delivery: isSupplier ? { supplierId: session.supplierId! } : undefined,
      },
      include: {
        delivery: { select: { deliveryNoteRef: true, status: true } },
      },
      orderBy: { colourCode: "asc" },
    }),
  ]);

  // Get acknowledged orders for this supplier (orders ready to start production)
  // Only ACKNOWLEDGED orders — supplier must accept (CONFIRMED→ACKNOWLEDGED) on the Orders page first
  const [acknowledgedOrders, pendingAcceptanceCount] = isSupplier
    ? await Promise.all([
        prisma.order.findMany({
          where: { supplierId: session.supplierId!, status: "ACKNOWLEDGED" },
          orderBy: { createdAt: "desc" },
          include: {
            orderLines: {
              include: { _count: { select: { productionRuns: true } } },
            },
            _count: { select: { orderLines: true } },
          },
        }),
        prisma.order.count({ where: { supplierId: session.supplierId!, status: "CONFIRMED" } }),
      ])
    : [[], 0];

  // Group yarn lots by colour code for the dropdown
  const yarnLotOptions = yarnLots.map((l) => ({
    lineId: l.id,
    colourCode: l.colourCode,
    colourName: l.colourName || "",
    lotNumber: l.lotNumber || "",
    remainingKg: l.remainingKg,
    deliveryRef: l.delivery.deliveryNoteRef,
    yarnType: l.yarnType,
  }));

  return (
    <ProductionRunsClient
      initialRuns={JSON.parse(JSON.stringify(runs))}
      suppliers={suppliers}
      yarnLots={yarnLotOptions}
      acknowledgedOrders={JSON.parse(JSON.stringify(acknowledgedOrders))}
      pendingAcceptanceCount={pendingAcceptanceCount as number}
      filterOrderLineId={orderLineId}
      isAdmin={session.role === "ADMIN"}
      userSupplierId={session.supplierId}
      showCreateOnLoad={params.create === "true"}
      prefill={{
        product: params.product || "",
        sku: params.sku || "",
        size: params.size || "",
        qty: params.qty ? parseInt(params.qty) : 0,
        orderLineId: orderLineId || 0,
      }}
    />
  );
}
