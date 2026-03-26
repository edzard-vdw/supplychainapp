import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY } from "@/types/supply-chain";

export default async function StockPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/materials");

  const [materials, garmentsByStatus, pendingOrders, activeRuns] = await Promise.all([
    prisma.materialColor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.garment.groupBy({
      by: ["isTagged"],
      _count: true,
    }),
    // Orders not yet delivered — incoming stock
    prisma.order.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED", "DRAFT"] } },
      select: {
        orderRef: true,
        status: true,
        totalQuantity: true,
        supplier: { select: { name: true } },
        dueDate: true,
      },
      orderBy: { dueDate: "asc" },
    }),
    // Active production runs
    prisma.productionRun.findMany({
      where: { status: { in: ["IN_PRODUCTION", "QC", "READY_TO_SHIP"] } },
      select: {
        runCode: true,
        status: true,
        quantity: true,
        unitsProduced: true,
        productName: true,
      },
    }),
  ]);

  const totalStock = materials.reduce((sum, m) => sum + m.remainingKg, 0);
  const totalInitial = materials.reduce((sum, m) => sum + m.stockWeightKg, 0);
  const tagged = garmentsByStatus.find((g) => g.isTagged)?._count || 0;
  const untagged = garmentsByStatus.find((g) => !g.isTagged)?._count || 0;
  const pendingUnits = pendingOrders.reduce((sum, o) => sum + o.totalQuantity, 0);
  const inProductionUnits = activeRuns.reduce((sum, r) => sum + r.quantity, 0);

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Overview</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Stock & Pipeline</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Material Stock</p>
          <p className="text-[24px] font-bold tabular-nums text-foreground">{totalStock.toFixed(0)} kg</p>
          <p className="text-[10px] text-muted-foreground">of {totalInitial.toFixed(0)} kg</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tagged Garments</p>
          <p className="text-[24px] font-bold tabular-nums text-badge-green-text">{tagged}</p>
          <p className="text-[10px] text-muted-foreground">{untagged} untagged</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Pending Orders</p>
          <p className="text-[24px] font-bold tabular-nums" style={{ color: "hsl(217 91% 60%)" }}>{pendingUnits}</p>
          <p className="text-[10px] text-muted-foreground">{pendingOrders.length} orders incoming</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">In Production</p>
          <p className="text-[24px] font-bold tabular-nums" style={{ color: "hsl(25 95% 53%)" }}>{inProductionUnits}</p>
          <p className="text-[10px] text-muted-foreground">{activeRuns.length} active runs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Material stock levels */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Material Stock Levels</h3>
          {materials.length > 0 ? (
            <div className="space-y-2.5">
              {materials.map((m) => {
                const usedPct = m.stockWeightKg > 0 ? ((m.stockWeightKg - m.remainingKg) / m.stockWeightKg) * 100 : 0;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    {m.hexValue && (
                      <div className="w-3 h-3 rounded border border-border shrink-0" style={{ backgroundColor: m.hexValue }} />
                    )}
                    <span className="text-[11px] text-foreground w-24 truncate">{m.name}</span>
                    <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${100 - usedPct}%`,
                          backgroundColor: usedPct > 80 ? "hsl(0 72% 51%)" : usedPct > 50 ? "hsl(45 93% 47%)" : "hsl(142 76% 36%)",
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono-brand text-muted-foreground w-20 text-right tabular-nums">
                      {m.remainingKg.toFixed(1)} kg
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No materials yet</p>
          )}
        </div>

        {/* Incoming orders pipeline */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Incoming Orders</h3>
          <p className="text-[10px] text-muted-foreground mb-3">Orders in progress that will add to stock</p>
          {pendingOrders.length > 0 ? (
            <div className="space-y-2">
              {pendingOrders.map((o, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{o.orderRef}</p>
                    <p className="text-[9px] text-muted-foreground">{o.supplier?.name || "Unassigned"}</p>
                  </div>
                  <Badge
                    label={ORDER_STATUS_DISPLAY[o.status]?.label || o.status}
                    bgClass={ORDER_STATUS_DISPLAY[o.status]?.bgClass || "bg-badge-gray-bg"}
                    textClass={ORDER_STATUS_DISPLAY[o.status]?.textClass || "text-badge-gray-text"}
                  />
                  <span className="text-[12px] font-bold font-mono-brand tabular-nums text-foreground">{o.totalQuantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No pending orders</p>
          )}
        </div>
      </div>

      {/* Active production runs */}
      {activeRuns.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mt-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Active Production Runs</h3>
          <div className="space-y-2">
            {activeRuns.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">{r.runCode}</p>
                  <p className="text-[9px] text-muted-foreground">{r.productName || "—"}</p>
                </div>
                <Badge
                  label={r.status === "IN_PRODUCTION" ? "In Production" : r.status === "QC" ? "QC" : "Ready to Ship"}
                  bgClass={r.status === "IN_PRODUCTION" ? "bg-badge-orange-bg" : r.status === "QC" ? "bg-badge-purple-bg" : "bg-badge-emerald-bg"}
                  textClass={r.status === "IN_PRODUCTION" ? "text-badge-orange-text" : r.status === "QC" ? "text-badge-purple-text" : "text-badge-emerald-text"}
                />
                <div className="w-20">
                  <div className="flex items-center justify-between text-[9px] mb-0.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-mono-brand tabular-nums">{r.unitsProduced}/{r.quantity}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.quantity > 0 ? (r.unitsProduced / r.quantity) * 100 : 0}%`, backgroundColor: "hsl(142 76% 36%)" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
