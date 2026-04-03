import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { getMaterials } from "@/lib/actions/materials";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY, RUN_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { OrdersClient } from "@/app/(protected)/(shell)/orders/orders-client";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; upload?: string; create?: string }>;
}) {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/production-runs");

  const { view, upload, create } = await searchParams;
  const isOrdersView = view === "orders";

  // ── Orders view ───────────────────────────────────────────────────────────
  if (isOrdersView) {
    const [orders, materials, suppliers] = await Promise.all([
      prisma.order.findMany({
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        include: {
          supplier: { select: { id: true, name: true } },
          _count: { select: { orderLines: true } },
        },
      }),
      getMaterials(),
      prisma.supplier.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, type: true },
      }),
    ]);

    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <PageHeader isOrdersView={true} />
        {/* Orders content — embedded, no inner header */}
        <OrdersClient
          initialOrders={JSON.parse(JSON.stringify(orders))}
          materials={JSON.parse(JSON.stringify(materials))}
          suppliers={suppliers}
          isAdmin={true}
          showUploadOnLoad={upload === "true"}
          showCreateOnLoad={create === "true"}
          embedded={true}
        />
      </div>
    );
  }

  // ── Overview view ─────────────────────────────────────────────────────────
  const [orders, runs] = await Promise.all([
    prisma.order.findMany({
      where: { status: { not: "DRAFT" } },
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
        order: { select: { orderRef: true } },
        _count: { select: { garments: true } },
      },
    }),
  ]);

  const PIPELINE_COLUMNS = ["PLANNED", "IN_PRODUCTION", "QC", "SHIPPED", "RECEIVED"] as const;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader isOrdersView={false} />

      {/* ── Supplier Overview (production run kanban) ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Supplier Overview</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Production runs by stage</p>
          </div>
          <Link
            href="/production-runs"
            className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
          >
            All runs →
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-2 px-2">
          {PIPELINE_COLUMNS.map((status) => {
            const display = RUN_STATUS_DISPLAY[status];
            const colRuns =
              status === "RECEIVED"
                ? runs.filter(
                    (r) =>
                      (r.status === "RECEIVED" || r.status === "COMPLETED") &&
                      Date.now() - new Date(r.updatedAt).getTime() < SEVEN_DAYS_MS,
                  )
                : runs.filter((r) => r.status === status);
            const olderCount =
              status === "RECEIVED"
                ? runs.filter(
                    (r) =>
                      (r.status === "RECEIVED" || r.status === "COMPLETED") &&
                      Date.now() - new Date(r.updatedAt).getTime() >= SEVEN_DAYS_MS,
                  ).length
                : 0;

            return (
              <div
                key={status}
                className="flex flex-col w-[200px] shrink-0 bg-card border border-border rounded-xl overflow-hidden"
              >
                <div className="px-3 py-2 border-b border-border bg-secondary/30 flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-foreground">
                    {display?.label ?? status}
                  </span>
                  <span className="text-[9px] font-mono-brand text-muted-foreground">{colRuns.length}</span>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-[80px] max-h-[55vh] overflow-y-auto">
                  {colRuns.map((run) => (
                    <Link
                      key={run.id}
                      href={`/production-runs/${run.id}`}
                      className="block bg-background border border-border rounded-lg p-2 hover:border-foreground/20 transition-colors"
                    >
                      <p className="text-[10px] font-semibold text-foreground truncate">{run.runCode}</p>
                      <p className="text-[8px] text-muted-foreground truncate">
                        {run.order?.orderRef ?? run.orderLine?.order?.orderRef ?? "No order"}
                      </p>
                      <p className="text-[8px] text-muted-foreground truncate">
                        {run.supplier?.name ?? "Unassigned"}
                      </p>
                      <p className="text-[9px] font-mono-brand text-muted-foreground mt-1">
                        {run._count.garments} tagged / {run.quantity}
                      </p>
                    </Link>
                  ))}
                  {colRuns.length === 0 && (
                    <p className="text-center text-[9px] text-muted-foreground/40 py-4">—</p>
                  )}
                  {olderCount > 0 && (
                    <p className="text-center text-[8px] text-muted-foreground/40 pt-1 border-t border-border mt-1">
                      +{olderCount} older
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Purchase Orders ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Purchase Orders</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{orders.length} active PO{orders.length !== 1 ? "s" : ""}</p>
          </div>
          <Link
            href="/overview?view=orders"
            className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
          >
            Manage →
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-foreground">{order.orderRef}</span>
                      <StatusBadge
                        display={ORDER_STATUS_DISPLAY[order.status] ?? ORDER_STATUS_DISPLAY.DRAFT}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {order.supplier?.name ?? "Unassigned"} · {order._count.orderLines} line
                      {order._count.orderLines !== 1 ? "s" : ""}
                      {order.dueDate && ` · Due ${formatDate(order.dueDate)}`}
                    </p>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    <p className="text-[14px] font-bold font-mono-brand tabular-nums text-foreground">
                      {order.totalQuantity.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-muted-foreground">units</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-border rounded-xl">
            <p className="text-[13px] font-semibold text-foreground mb-1">No orders yet</p>
            <p className="text-[11px] text-muted-foreground">
              Go to Orders to upload a PO or create one manually
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared page header — identical markup in both views so toggle never jumps ─
function PageHeader({ isOrdersView }: { isOrdersView: boolean }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
      {/* Toggle */}
      <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
        <Link
          href="/overview"
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
            !isOrdersView
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </Link>
        <Link
          href="/overview?view=orders"
          className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
            isOrdersView
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Orders
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          href="/overview?view=orders&upload=true"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-[11px] font-semibold uppercase tracking-wider hover:bg-secondary/70 transition-colors"
        >
          Upload PO
        </Link>
        <Link
          href="/overview?view=orders&create=true"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 transition-colors"
        >
          + New PO
        </Link>
      </div>
    </div>
  );
}
