import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ORDER_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { StatusBadge } from "@/components/ui/badge";

export default async function PoViewPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const id = parseInt(orderId);
  if (isNaN(id)) notFound();

  const session = await getSession();

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderLines: {
        include: { color: { select: { name: true, hexValue: true } } },
        orderBy: { createdAt: "asc" },
      },
      supplier: { select: { name: true } },
    },
  });

  if (!order) notFound();

  // Suppliers can only view their own orders
  if (session.role !== "ADMIN" && order.supplierId !== session.supplierId) notFound();

  const display = ORDER_STATUS_DISPLAY[order.status] ?? ORDER_STATUS_DISPLAY.DRAFT;
  const totalOrdered = order.orderLines.reduce((s, l) => s + l.quantity, 0);

  return (
    <div className="px-4 py-6 max-w-[700px] mx-auto">
      {/* Back */}
      <Link
        href="/production-runs"
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        Back to Jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Purchase Order</p>
          <h1 className="text-[22px] font-bold uppercase tracking-wide text-foreground">{order.orderRef}</h1>
          {order.client && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{order.client}</p>
          )}
        </div>
        <StatusBadge display={display} />
      </div>

      {/* Meta */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Due Date</p>
            <p className="text-[13px] font-semibold text-foreground">
              {order.dueDate ? formatDate(order.dueDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Total Units</p>
            <p className="text-[13px] font-bold tabular-nums text-foreground">{totalOrdered.toLocaleString()}</p>
          </div>
          {order.season && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Season</p>
              <p className="text-[13px] font-semibold text-foreground">{order.season}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
              <p className="text-[12px] text-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Order lines */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
            Order Lines ({order.orderLines.length})
          </h2>
        </div>
        <table className="w-full text-[12px]">
          <thead className="bg-secondary/30">
            <tr>
              <th className="text-left px-5 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Product</th>
              <th className="text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Size</th>
              <th className="text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Colour</th>
              <th className="text-right px-5 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Qty</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {order.orderLines.map((line) => (
              <tr key={line.id}>
                <td className="px-5 py-3 font-semibold text-foreground">{line.product}</td>
                <td className="px-3 py-3 text-muted-foreground">{line.size || "—"}</td>
                <td className="px-3 py-3">
                  {line.color ? (
                    <div className="flex items-center gap-1.5">
                      {line.color.hexValue && (
                        <div className="w-3 h-3 rounded-full border border-border shrink-0" style={{ backgroundColor: line.color.hexValue }} />
                      )}
                      <span className="text-muted-foreground">{line.color.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 font-mono font-bold tabular-nums text-right text-foreground">{line.quantity.toLocaleString()}</td>
              </tr>
            ))}
            <tr className="bg-secondary/20">
              <td className="px-5 py-3 font-bold text-foreground" colSpan={3}>Total</td>
              <td className="px-5 py-3 font-mono font-bold tabular-nums text-right text-foreground">{totalOrdered.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
