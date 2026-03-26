import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const CATEGORY_DISPLAY: Record<string, { label: string; unit: string; color: string }> = {
  GHG: { label: "GHG", unit: "kgCO₂e", color: "hsl(0 72% 51%)" },
  WATER: { label: "Water", unit: "litres", color: "hsl(200 80% 50%)" },
  ENERGY: { label: "Energy", unit: "kWh", color: "hsl(45 93% 47%)" },
  WASTE: { label: "Waste", unit: "kg", color: "hsl(25 95% 53%)" },
  LAND_USE: { label: "Land", unit: "m²", color: "hsl(142 76% 36%)" },
  CHEMICAL: { label: "Chemical", unit: "kg", color: "hsl(340 75% 55%)" },
};

export default async function ImpactBySuppliersPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/impact");

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      facilityProfile: {
        select: { energySource: true, renewablePct: true, waterSource: true, wasteManagement: true },
      },
      certifications: {
        select: { name: true },
        take: 5,
      },
      impactRecords: {
        select: { category: true, value: true, unit: true, scope: true, status: true },
      },
    },
  });

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin · Impact</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">By Supplier</h1>
      </div>

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-4">{suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""}</p>

      <div className="space-y-4">
        {suppliers.map((supplier) => {
          // Aggregate impact by category
          const catTotals = new Map<string, number>();
          let totalRecords = 0;
          let approved = 0;
          let pending = 0;
          for (const r of supplier.impactRecords) {
            catTotals.set(r.category, (catTotals.get(r.category) || 0) + r.value);
            totalRecords++;
            if (r.status === "APPROVED") approved++;
            if (r.status === "SUBMITTED") pending++;
          }

          return (
            <div key={supplier.id} className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-[14px] font-bold text-foreground">{supplier.name}</h3>
                    <p className="text-[10px] text-muted-foreground">
                      {supplier.type} {supplier.country ? `· ${supplier.country}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono-brand text-muted-foreground">
                    <span>{totalRecords} records</span>
                    {pending > 0 && <Badge label={`${pending} pending`} bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />}
                    {approved > 0 && <Badge label={`${approved} approved`} bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />}
                  </div>
                </div>

                {/* Certifications */}
                {supplier.certifications.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {supplier.certifications.map((c, i) => (
                      <Badge key={i} label={c.name} bgClass="bg-badge-emerald-bg" textClass="text-badge-emerald-text" />
                    ))}
                  </div>
                )}
              </div>

              {/* Impact data */}
              <div className="px-5 py-4">
                {catTotals.size > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Array.from(catTotals.entries()).map(([cat, total]) => {
                      const display = CATEGORY_DISPLAY[cat] || { label: cat, unit: "", color: "gray" };
                      return (
                        <div key={cat}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: display.color }} />
                            <span className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{display.label}</span>
                          </div>
                          <p className="text-[14px] font-bold tabular-nums text-foreground">
                            {total < 10 ? total.toFixed(1) : Math.round(total).toLocaleString()}
                          </p>
                          <p className="text-[9px] text-muted-foreground">{display.unit}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {supplier.facilityProfile ? (
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        {supplier.facilityProfile.energySource && <span>Energy: {supplier.facilityProfile.energySource}</span>}
                        {supplier.facilityProfile.renewablePct != null && <span>Renewable: {supplier.facilityProfile.renewablePct}%</span>}
                        {supplier.facilityProfile.waterSource && <span>Water: {supplier.facilityProfile.waterSource}</span>}
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">No impact data or facility profile submitted</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {suppliers.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-[13px] font-semibold text-foreground mb-1">No suppliers</p>
            <p className="text-[11px] text-muted-foreground">Add suppliers to see their impact data here</p>
          </div>
        )}
      </div>
    </div>
  );
}
