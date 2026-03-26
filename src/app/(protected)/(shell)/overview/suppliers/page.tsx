import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RUN_STATUS_DISPLAY } from "@/types/supply-chain";

export default async function OverviewBySuppliersPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/production-runs");

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { productionRuns: true, orders: true } },
      productionRuns: {
        select: { status: true },
      },
      facilityProfile: {
        select: { renewablePct: true, employeeCount: true },
      },
      certifications: {
        select: { name: true },
        take: 5,
      },
    },
  });

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Suppliers Overview</h1>
      </div>

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-4">{suppliers.length} active supplier{suppliers.length !== 1 ? "s" : ""}</p>

      <div className="space-y-3">
        {suppliers.map((supplier) => {
          const statusCounts: Record<string, number> = {};
          for (const run of supplier.productionRuns) {
            statusCounts[run.status] = (statusCounts[run.status] || 0) + 1;
          }

          return (
            <div key={supplier.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-[14px] font-bold text-foreground">{supplier.name}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {supplier.type} {supplier.country ? `· ${supplier.country}` : ""}
                    {supplier.facilityProfile?.employeeCount ? ` · ${supplier.facilityProfile.employeeCount} employees` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono-brand text-muted-foreground">{supplier._count.productionRuns} runs</span>
                  <span className="text-[10px] font-mono-brand text-muted-foreground">{supplier._count.orders} orders</span>
                </div>
              </div>

              {/* Run status breakdown */}
              {supplier.productionRuns.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge
                      key={status}
                      label={`${RUN_STATUS_DISPLAY[status]?.label || status}: ${count}`}
                      bgClass={RUN_STATUS_DISPLAY[status]?.bgClass || "bg-badge-gray-bg"}
                      textClass={RUN_STATUS_DISPLAY[status]?.textClass || "text-badge-gray-text"}
                    />
                  ))}
                </div>
              )}

              {/* Certifications */}
              {supplier.certifications.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {supplier.certifications.map((c, i) => (
                    <Badge key={i} label={c.name} bgClass="bg-badge-emerald-bg" textClass="text-badge-emerald-text" />
                  ))}
                </div>
              )}

              {/* Renewable energy */}
              {supplier.facilityProfile?.renewablePct != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Renewable Energy</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${supplier.facilityProfile.renewablePct}%`, backgroundColor: "hsl(142 76% 36%)" }} />
                  </div>
                  <span className="text-[10px] font-mono-brand text-foreground tabular-nums">{supplier.facilityProfile.renewablePct}%</span>
                </div>
              )}

              {supplier.productionRuns.length === 0 && supplier.certifications.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No production runs or impact data yet</p>
              )}
            </div>
          );
        })}

        {suppliers.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-[13px] font-semibold text-foreground mb-1">No suppliers</p>
            <p className="text-[11px] text-muted-foreground">Add suppliers in Settings to see them here</p>
          </div>
        )}
      </div>
    </div>
  );
}
