import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY, RUN_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";

export default async function OverviewPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/production-runs");

  const [orders, runs] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "DRAFT" } }, // Don't show drafts in overview
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { name: true } },
        _count: { select: { orderLines: true } },
      },
    }),
    prisma.productionRun.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { id: true, name: true, type: true, country: true } },
        orderLine: { include: { order: { select: { orderRef: true } } } },
        _count: { select: { garments: true } },
      },
    }),
  ]);

  // Order status counts
  const orderCounts = {
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    ACKNOWLEDGED: orders.filter((o) => o.status === "ACKNOWLEDGED").length,
    IN_PRODUCTION: orders.filter((o) => o.status === "IN_PRODUCTION").length,
    SHIPPED: orders.filter((o) => o.status === "SHIPPED").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
  };

  // Run status counts
  const runCounts = {
    PLANNED: runs.filter((r) => r.status === "PLANNED").length,
    IN_PRODUCTION: runs.filter((r) => r.status === "IN_PRODUCTION").length,
    QC: runs.filter((r) => r.status === "QC").length,
    SHIPPED: runs.filter((r) => r.status === "SHIPPED").length,
    COMPLETED: runs.filter((r) => r.status === "COMPLETED").length,
  };

  // Active orders (not delivered/completed)
  const activeOrders = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status));

  // Group runs by supplier
  const supplierMap = new Map<string, typeof runs>();
  for (const run of runs) {
    const key = run.supplier?.name || "Unassigned";
    if (!supplierMap.has(key)) supplierMap.set(key, []);
    supplierMap.get(key)!.push(run);
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Supply Chain Overview</h1>
      </div>

      {/* Order KPIs */}
      <div className="mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">Orders</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(orderCounts).map(([status, count]) => (
            <div key={status} className="bg-card border border-border rounded-xl p-3">
              <p className="text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">
                {ORDER_STATUS_DISPLAY[status]?.label || status}
              </p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Orders — awaiting action */}
      {activeOrders.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Active Orders ({activeOrders.length})</h3>
          </div>
          <div className="divide-y divide-border">
            {activeOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-foreground">{order.orderRef}</span>
                    <StatusBadge display={ORDER_STATUS_DISPLAY[order.status] || ORDER_STATUS_DISPLAY.DRAFT} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {order.supplier?.name || "Unassigned"} · {order._count.orderLines} line{order._count.orderLines !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[13px] font-bold font-mono-brand tabular-nums">{order.totalQuantity}</p>
                  <p className="text-[9px] text-muted-foreground">units</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Run KPIs */}
      <div className="mb-6">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">Production Runs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(runCounts).map(([status, count]) => (
            <div key={status} className="bg-card border border-border rounded-xl p-3">
              <p className="text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">
                {RUN_STATUS_DISPLAY[status]?.label || status}
              </p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Runs grouped by supplier */}
      <div className="space-y-6">
        {Array.from(supplierMap.entries()).map(([supplierName, supplierRuns]) => (
          <div key={supplierName} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wide">{supplierName}</h3>
                  {supplierRuns[0]?.supplier && (
                    <p className="text-[10px] text-muted-foreground">
                      {supplierRuns[0].supplier.type} {supplierRuns[0].supplier.country ? `· ${supplierRuns[0].supplier.country}` : ""}
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-mono-brand text-muted-foreground">
                  {supplierRuns.length} run{supplierRuns.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {supplierRuns.map((run) => (
                <Link
                  key={run.id}
                  href={`/production-runs/${run.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-foreground">{run.runCode}</span>
                      <StatusBadge display={RUN_STATUS_DISPLAY[run.status] || RUN_STATUS_DISPLAY.PLANNED} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {run.orderLine?.order?.orderRef || "No order"} · {run.quantity} units
                    </p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-mono-brand tabular-nums text-foreground">{run._count.garments} tagged</p>
                    <p className="text-[9px] text-muted-foreground">{formatDate(run.startDate)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {runs.length === 0 && activeOrders.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-[13px] font-semibold text-foreground mb-1">No activity yet</p>
          <p className="text-[11px] text-muted-foreground">Submit orders to suppliers and create production runs to see them here</p>
        </div>
      )}
    </div>
  );
}
