"use client";

import { useState } from "react";
import { Leaf, FileDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CATEGORY_DISPLAY: Record<string, { label: string; unit: string; color: string }> = {
  GHG: { label: "GHG Emissions", unit: "kgCO₂e", color: "hsl(0 72% 51%)" },
  WATER: { label: "Water Use", unit: "litres", color: "hsl(200 80% 50%)" },
  ENERGY: { label: "Energy Use", unit: "kWh", color: "hsl(45 93% 47%)" },
  WASTE: { label: "Waste", unit: "kg", color: "hsl(25 95% 53%)" },
  LAND_USE: { label: "Land Use", unit: "m²", color: "hsl(142 76% 36%)" },
  BIODIVERSITY: { label: "Biodiversity", unit: "score", color: "hsl(271 76% 53%)" },
  CHEMICAL: { label: "Chemical Use", unit: "kg", color: "hsl(340 75% 55%)" },
};

type OverviewData = {
  totalRecords: number;
  byCategory: { category: string; totalValue: number; count: number }[];
  bySupplier: { supplierId: number; supplierName: string; totalValue: number; count: number }[];
};

type DppExportItem = {
  runId: number;
  runCode: string;
  sku: string | null;
  productName: string | null;
  quantity: number;
  supplierName: string | null;
  supplierType: string | null;
  impacts: { category: string; totalValue: number; perGarment: number; unit: string; dataQuality: string }[];
};

export function AdminImpactView({ overview, dppData, pendingCount }: { overview: OverviewData; dppData: DppExportItem[]; pendingCount: number }) {
  const [activeTab, setActiveTab] = useState<"overview" | "dpp" | "suppliers">("overview");

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Impact & DPP Data</h1>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-badge-orange-bg text-badge-orange-text">
            <AlertCircle size={12} />
            <span className="text-[10px] font-bold">{pendingCount} pending review</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 mb-6">
        {(["overview", "dpp", "suppliers"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "overview" ? "Overview" : tab === "dpp" ? "DPP Export" : "By Supplier"}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Total Impact Records</p>
            <p className="text-[28px] font-bold tabular-nums" style={{ color: "hsl(174 72% 46%)" }}>{overview.totalRecords}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By category */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">By Category</h3>
              {overview.byCategory.length > 0 ? (
                <div className="space-y-3">
                  {overview.byCategory.map((c) => {
                    const display = CATEGORY_DISPLAY[c.category] || { label: c.category, unit: "", color: "hsl(215 16% 47%)" };
                    return (
                      <div key={c.category} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: display.color }} />
                        <span className="text-[11px] text-foreground w-28">{display.label}</span>
                        <span className="flex-1 text-[12px] font-mono-brand font-bold text-foreground tabular-nums text-right">
                          {c.totalValue < 10 ? c.totalValue.toFixed(1) : Math.round(c.totalValue).toLocaleString()} {display.unit}
                        </span>
                        <span className="text-[9px] text-muted-foreground w-16 text-right">{c.count ?? 0} records</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Leaf size={24} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-[11px] text-muted-foreground">No impact data yet</p>
                </div>
              )}
            </div>

            {/* By supplier */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">By Supplier</h3>
              {overview.bySupplier.length > 0 ? (
                <div className="space-y-3">
                  {overview.bySupplier.map((s) => {
                    const maxVal = overview.bySupplier[0]?.totalValue || 1;
                    return (
                      <div key={s.supplierId}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-foreground">{s.supplierName}</span>
                          <span className="text-[10px] font-mono-brand text-muted-foreground">{s.count ?? 0} records</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(s.totalValue / maxVal) * 100}%`, backgroundColor: "hsl(174 72% 46%)" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">No supplier data submitted yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DPP Export tab */}
      {activeTab === "dpp" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              Per-product impact data derived from approved production run records. Ready to feed into The Thread&apos;s DPP.
            </p>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold uppercase tracking-wider">
              <FileDown size={12} /> Export CSV
            </button>
          </div>

          {dppData.length > 0 ? (
            <div className="space-y-3">
              {dppData.map((item) => (
                <div key={item.runId} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">{item.productName || "Unknown Product"}</p>
                      <p className="text-[10px] text-muted-foreground font-mono-brand">
                        {item.sku || "—"} · Run: {item.runCode} · {item.quantity} units
                      </p>
                    </div>
                    {item.supplierName && <Badge label={item.supplierName} bgClass="bg-badge-blue-bg" textClass="text-badge-blue-text" />}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {item.impacts.map((impact) => {
                      const display = CATEGORY_DISPLAY[impact.category] || { label: impact.category, unit: "", color: "gray" };
                      return (
                        <div key={impact.category} className="bg-secondary/30 rounded-lg p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: display.color }} />
                            <span className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{display.label}</span>
                          </div>
                          <p className="text-[14px] font-bold tabular-nums text-foreground">
                            {impact.perGarment < 1 ? impact.perGarment.toFixed(2) : impact.perGarment.toFixed(1)}
                          </p>
                          <p className="text-[9px] text-muted-foreground">{display.unit} per garment</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Leaf size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] font-semibold text-foreground mb-1">No DPP data yet</p>
              <p className="text-[11px] text-muted-foreground">Approved run-level impact records will appear here with per-garment calculations</p>
            </div>
          )}
        </div>
      )}

      {/* By supplier tab */}
      {activeTab === "suppliers" && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-[13px] font-semibold text-foreground mb-1">Supplier Detail View</p>
          <p className="text-[11px] text-muted-foreground">Coming soon — drill into each supplier&apos;s facility profile, certifications, and run impact data</p>
        </div>
      )}
    </div>
  );
}
