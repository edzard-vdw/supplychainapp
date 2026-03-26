import { prisma } from "@/lib/db";
import { getSession, getSupplierFilter } from "@/lib/session";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { SupplierOrderActions } from "./supplier-order-actions";

export default async function SupplierOrdersTab() {
  const session = await getSession();
  const supplierFilter = getSupplierFilter(session);

  const orders = await prisma.order.findMany({
    where: supplierFilter,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      supplier: { select: { name: true } },
      _count: { select: { orderLines: true } },
    },
  });

  const needsAck = orders.filter((o) => o.status === "CONFIRMED");
  const activeOrders = orders.filter((o) => !["DRAFT", "DELIVERED", "CANCELLED"].includes(o.status));

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-6">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Production</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">My Orders</h1>
      </div>

      {/* Orders needing acknowledgment */}
      {needsAck.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-badge-blue-text mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-badge-blue-text text-white flex items-center justify-center text-[10px] font-bold">{needsAck.length}</span>
            Action Required — Acknowledge Receipt
          </h2>
          <div className="space-y-2">
            {needsAck.map((order) => (
              <div key={order.id} className="bg-card border-2 border-badge-blue-text/20 rounded-xl overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[14px] font-bold text-foreground">{order.orderRef}</p>
                      <StatusBadge display={ORDER_STATUS_DISPLAY[order.status] || ORDER_STATUS_DISPLAY.DRAFT} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {order.client || "—"} · {order._count.orderLines} line{order._count.orderLines !== 1 ? "s" : ""} · {order.totalQuantity.toLocaleString()} units
                      {order.dueDate && ` · Due ${formatDate(order.dueDate)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/orders/${order.id}`} className="px-3 py-2 rounded-lg text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      View Details
                    </Link>
                    <SupplierOrderActions orderId={order.id} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All active orders */}
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">
        All Orders ({activeOrders.length})
      </h2>
      <div className="space-y-2">
        {activeOrders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex items-center gap-4 px-5 py-4 bg-card border border-border rounded-xl hover:bg-secondary/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[13px] font-semibold text-foreground">{order.orderRef}</p>
                <StatusBadge display={ORDER_STATUS_DISPLAY[order.status] || ORDER_STATUS_DISPLAY.DRAFT} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {order.client || "—"} · {order._count.orderLines} line{order._count.orderLines !== 1 ? "s" : ""}
                {order.dueDate && ` · Due ${formatDate(order.dueDate)}`}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[14px] font-bold font-mono-brand text-foreground tabular-nums">{order.totalQuantity.toLocaleString()}</p>
              <p className="text-[9px] text-muted-foreground">units</p>
            </div>
          </Link>
        ))}

        {activeOrders.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-[13px] font-semibold text-foreground mb-1">No orders assigned</p>
            <p className="text-[11px] text-muted-foreground">Orders will appear here when admin assigns them to you</p>
          </div>
        )}
      </div>
    </div>
  );
}
