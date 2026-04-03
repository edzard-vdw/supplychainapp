import { prisma } from "@/lib/db";
import { getSession, getSupplierFilter } from "@/lib/session";
import { ProductionRunsClient } from "./production-runs-client";
import { JobsView } from "./jobs-view";

export default async function ProductionRunsPage({ searchParams }: { searchParams: Promise<{ orderLineId?: string; create?: string; product?: string; sku?: string; size?: string; qty?: string }> }) {
  const session = await getSession();
  const params = await searchParams;
  const supplierFilter = getSupplierFilter(session);
  const orderLineId = params.orderLineId ? parseInt(params.orderLineId) : undefined;
  const isSupplier = session.role !== "ADMIN" && session.supplierId;

  // ── Supplier: show unified Jobs view ──────────────────────────────────────
  if (isSupplier) {
    const [pendingJobs, activeRuns, allOrders, yarnLots] = await Promise.all([
      // CONFIRMED orders = new jobs waiting for acceptance
      prisma.order.findMany({
        where: { supplierId: session.supplierId!, status: "CONFIRMED" },
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        include: {
          orderLines: { select: { product: true, size: true, quantity: true } },
          _count: { select: { orderLines: true } },
        },
      }),
      // Active production runs (not completed/cancelled)
      prisma.productionRun.findMany({
        where: {
          supplierId: session.supplierId!,
          status: { notIn: ["COMPLETED", "RECEIVED"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          order: { select: { orderRef: true, dueDate: true } },
          sizeBreakdown: { select: { size: true, quantity: true, produced: true } },
          _count: { select: { garments: true } },
        },
      }),
      // All orders for this supplier (any status) — for Orders tab
      prisma.order.findMany({
        where: { supplierId: session.supplierId! },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          orderRef: true,
          status: true,
          client: true,
          dueDate: true,
          totalQuantity: true,
          _count: { select: { orderLines: true } },
        },
      }),
      // Yarn lots available to this supplier (linked via delivery's supplierId)
      prisma.yarnDeliveryLine.findMany({
        where: {
          remainingKg: { gt: 0 },
          delivery: { supplierId: session.supplierId! },
        },
        include: { delivery: { select: { deliveryNoteRef: true } } },
        orderBy: [{ colourCode: "asc" }, { lotNumber: "asc" }],
      }),
    ]);

    return (
      <JobsView
        pendingJobs={JSON.parse(JSON.stringify(pendingJobs))}
        activeRuns={JSON.parse(JSON.stringify(activeRuns))}
        allOrders={JSON.parse(JSON.stringify(allOrders))}
        yarnLots={JSON.parse(JSON.stringify(yarnLots))}
        language={session.language ?? "en"}
      />
    );
  }

  // ── Admin: keep existing production runs view ──────────────────────────────
  const [runs, suppliers, yarnLots, shippedCount] = await Promise.all([
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
    prisma.yarnDeliveryLine.findMany({
      where: { remainingKg: { gt: 0 } },
      include: { delivery: { select: { deliveryNoteRef: true, status: true } } },
      orderBy: { colourCode: "asc" },
    }),
    // Runs awaiting admin receipt confirmation
    prisma.productionRun.count({ where: { status: "SHIPPED" } }),
  ]);

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
      acknowledgedOrders={[]}
      pendingAcceptanceCount={0}
      shippedAwaitingReceipt={shippedCount}
      filterOrderLineId={orderLineId}
      isAdmin={true}
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
