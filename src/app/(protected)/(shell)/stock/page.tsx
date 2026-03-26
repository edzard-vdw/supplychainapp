import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function StockPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/materials");

  const [materials, garmentsByStatus, shopifyProducts] = await Promise.all([
    prisma.materialColor.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.garment.groupBy({
      by: ["isTagged"],
      _count: true,
    }),
    prisma.shopifyProduct.findMany({
      orderBy: { lastSyncAt: "desc" },
      take: 50,
    }),
  ]);

  const totalStock = materials.reduce((sum, m) => sum + m.remainingKg, 0);
  const totalInitial = materials.reduce((sum, m) => sum + m.stockWeightKg, 0);
  const tagged = garmentsByStatus.find((g) => g.isTagged)?._count || 0;
  const untagged = garmentsByStatus.find((g) => !g.isTagged)?._count || 0;

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Stock & Inventory</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Material Stock</p>
          <p className="text-[24px] font-bold tabular-nums text-foreground">{totalStock.toFixed(0)} kg</p>
          <p className="text-[10px] text-muted-foreground">of {totalInitial.toFixed(0)} kg initial</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Active Colours</p>
          <p className="text-[24px] font-bold tabular-nums text-foreground">{materials.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tagged Garments</p>
          <p className="text-[24px] font-bold tabular-nums text-badge-green-text">{tagged}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Untagged Garments</p>
          <p className="text-[24px] font-bold tabular-nums text-badge-orange-text">{untagged}</p>
        </div>
      </div>

      {/* Material stock levels */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Material Stock Levels</h3>
        {materials.length > 0 ? (
          <div className="space-y-2.5">
            {materials.map((m) => {
              const usedPct = m.stockWeightKg > 0 ? ((m.stockWeightKg - m.remainingKg) / m.stockWeightKg) * 100 : 0;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  {m.hexValue && (
                    <div className="w-4 h-4 rounded border border-border shrink-0" style={{ backgroundColor: m.hexValue }} />
                  )}
                  <span className="text-[11px] text-foreground w-28 truncate">{m.name}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${100 - usedPct}%`,
                        backgroundColor: usedPct > 80 ? "hsl(0 72% 51%)" : usedPct > 50 ? "hsl(45 93% 47%)" : "hsl(142 76% 36%)",
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono-brand text-muted-foreground w-24 text-right tabular-nums">
                    {m.remainingKg.toFixed(1)} / {m.stockWeightKg.toFixed(1)} kg
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No materials yet</p>
        )}
      </div>

      {/* Shopify sync */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Shopify Inventory</h3>
          <span className="text-[10px] font-mono-brand text-muted-foreground">{shopifyProducts.length} products synced</span>
        </div>
        {shopifyProducts.length > 0 ? (
          <div className="space-y-1">
            {shopifyProducts.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-[11px] text-foreground">{p.title}</p>
                  <p className="text-[9px] text-muted-foreground font-mono-brand">{p.sku || "—"}</p>
                </div>
                <span className="text-[12px] font-bold font-mono-brand tabular-nums text-foreground">{p.inventoryQty}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No Shopify data. Configure sync in Settings.</p>
        )}
      </div>
    </div>
  );
}
