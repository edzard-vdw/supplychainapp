"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Leaf, Shield, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createImpactRecord } from "@/lib/actions/impact";
import { upsertFacilityProfile, addCertification } from "@/lib/actions/facility";

const CATEGORIES = [
  { value: "GHG", label: "GHG Emissions", unit: "kgCO₂e" },
  { value: "WATER", label: "Water Use", unit: "litres" },
  { value: "ENERGY", label: "Energy Use", unit: "kWh" },
  { value: "WASTE", label: "Waste", unit: "kg" },
  { value: "LAND_USE", label: "Land Use", unit: "m²" },
  { value: "CHEMICAL", label: "Chemical Use", unit: "kg" },
];

const STATUS_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = {
  DRAFT: { label: "Draft", bgClass: "bg-badge-gray-bg", textClass: "text-badge-gray-text" },
  SUBMITTED: { label: "Submitted", bgClass: "bg-badge-blue-bg", textClass: "text-badge-blue-text" },
  APPROVED: { label: "Approved", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
  REJECTED: { label: "Rejected", bgClass: "bg-badge-red-bg", textClass: "text-badge-red-text" },
};

type ImpactRecord = {
  id: number; category: string; value: number; unit: string; dataQuality: string; status: string; scope: string; period: string | null; notes: string | null; createdAt: string; productionRun: { runCode: string } | null;
};

type FacilityProfileData = {
  energySource: string | null; renewablePct: number | null; annualEnergyKwh: number | null;
  waterSource: string | null; annualWaterL: number | null; waterRecyclingPct: number | null;
  wasteManagement: string | null; annualWasteKg: number | null;
  facilitySize: number | null; employeeCount: number | null; operatingHours: string | null; notes: string | null;
} | null;

type Certification = { id: number; name: string; certNumber: string | null; issuedBy: string | null; validFrom: string | null; validUntil: string | null };
type RunOption = { id: number; runCode: string; productName: string | null; quantity: number };

type OverviewData = { totalRecords: number; byCategory: { category: string; totalValue: number; count: number }[] };

export function SupplierImpactView({
  overview, records, facilityProfile, certifications, productionRuns, supplierId, supplierName,
}: {
  overview: OverviewData; records: ImpactRecord[]; facilityProfile: FacilityProfileData; certifications: Certification[]; productionRuns: RunOption[]; supplierId: number; supplierName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"facility" | "runs" | "records">("facility");

  // Add impact record form
  const [showAdd, setShowAdd] = useState(false);
  const [category, setCategory] = useState("GHG");
  const [value, setValue] = useState("");
  const [quality, setQuality] = useState("ESTIMATED");
  const [scope, setScope] = useState("PRODUCTION_RUN");
  const [runId, setRunId] = useState<number | null>(null);
  const [period, setPeriod] = useState("");
  const [notes, setNotes] = useState("");

  // Facility profile form
  const [energySource, setEnergySource] = useState(facilityProfile?.energySource || "");
  const [renewablePct, setRenewablePct] = useState(facilityProfile?.renewablePct?.toString() || "");
  const [waterSource, setWaterSource] = useState(facilityProfile?.waterSource || "");
  const [wasteManagement, setWasteManagement] = useState(facilityProfile?.wasteManagement || "");
  const [employeeCount, setEmployeeCount] = useState(facilityProfile?.employeeCount?.toString() || "");

  // Add cert form
  const [showAddCert, setShowAddCert] = useState(false);
  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [certIssuedBy, setCertIssuedBy] = useState("");

  const selectedCat = CATEGORIES.find((c) => c.value === category)!;

  function handleSubmitImpact() {
    if (!value) return;
    startTransition(async () => {
      await createImpactRecord({
        supplierId, category, value: parseFloat(value), unit: selectedCat.unit,
        dataQuality: quality, productionRunId: scope === "PRODUCTION_RUN" ? runId : null,
        period: period || null, notes: notes || null,
      });
      setValue(""); setPeriod(""); setNotes(""); setShowAdd(false);
      router.refresh();
    });
  }

  function handleSaveProfile() {
    startTransition(async () => {
      await upsertFacilityProfile(supplierId, {
        energySource: energySource || null,
        renewablePct: renewablePct ? parseFloat(renewablePct) : null,
        waterSource: waterSource || null,
        wasteManagement: wasteManagement || null,
        employeeCount: employeeCount ? parseInt(employeeCount) : null,
      });
      router.refresh();
    });
  }

  function handleAddCert() {
    if (!certName) return;
    startTransition(async () => {
      await addCertification(supplierId, { name: certName, certNumber: certNumber || null, issuedBy: certIssuedBy || null });
      setCertName(""); setCertNumber(""); setCertIssuedBy(""); setShowAddCert(false);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{supplierName}</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Impact Data</h1>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white" style={{ backgroundColor: "hsl(174 72% 46%)" }}>
          <Plus size={14} /> Add Record
        </button>
      </div>

      {/* Add impact record */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">New Impact Record</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Scope</label>
              <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="FACILITY">Facility-level</option>
                <option value="PRODUCTION_RUN">Production Run</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Value ({selectedCat.unit})</label>
              <input type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Data Quality</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="MEASURED">Measured</option>
                <option value="ESTIMATED">Estimated</option>
                <option value="BENCHMARKED">Benchmarked</option>
              </select>
            </div>
          </div>
          {scope === "PRODUCTION_RUN" && (
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Production Run</label>
              <select value={runId ?? ""} onChange={(e) => setRunId(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select run...</option>
                {productionRuns.map((r) => <option key={r.id} value={r.id}>{r.runCode} — {r.productName || "Unknown"} ({r.quantity} units)</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSubmitImpact} disabled={isPending || !value} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50">{isPending ? "Submitting..." : "Submit"}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 mb-6">
        {(["facility", "runs", "records"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {tab === "facility" ? "Facility Profile" : tab === "runs" ? "Run Impact" : "All Records"}
          </button>
        ))}
      </div>

      {/* Facility Profile tab */}
      {activeTab === "facility" && (
        <div className="space-y-6">
          {/* Profile form */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-muted-foreground" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Facility Details</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Energy Source</label>
                <input value={energySource} onChange={(e) => setEnergySource(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Grid + 60% Solar" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Renewable %</label>
                <input type="number" value={renewablePct} onChange={(e) => setRenewablePct(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" placeholder="0-100" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Water Source</label>
                <input value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Municipal + Rainwater" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Waste Management</label>
                <input value={wasteManagement} onChange={(e) => setWasteManagement(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Zero landfill" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Employees</label>
                <input type="number" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={isPending} className="mt-4 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider disabled:opacity-50">
              {isPending ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {/* Certifications */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-muted-foreground" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Certifications</h3>
              </div>
              <button onClick={() => setShowAddCert(!showAddCert)} className="text-[10px] font-semibold text-primary hover:text-primary/80">
                <Plus size={12} className="inline" /> Add
              </button>
            </div>
            {showAddCert && (
              <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-secondary/30 rounded-lg">
                <input value={certName} onChange={(e) => setCertName(e.target.value)} className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none" placeholder="Cert name (e.g. GOTS)" />
                <input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} className="px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none" placeholder="Cert number" />
                <div className="flex gap-2">
                  <input value={certIssuedBy} onChange={(e) => setCertIssuedBy(e.target.value)} className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none" placeholder="Issued by" />
                  <button onClick={handleAddCert} disabled={isPending || !certName} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold disabled:opacity-40">Add</button>
                </div>
              </div>
            )}
            {certifications.length > 0 ? (
              <div className="space-y-2">
                {certifications.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Badge label={c.name} bgClass="bg-badge-emerald-bg" textClass="text-badge-emerald-text" />
                    {c.certNumber && <span className="text-[10px] font-mono-brand text-muted-foreground">{c.certNumber}</span>}
                    {c.issuedBy && <span className="text-[10px] text-muted-foreground">by {c.issuedBy}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No certifications added yet</p>
            )}
          </div>
        </div>
      )}

      {/* Run Impact tab */}
      {activeTab === "runs" && (
        <div className="space-y-4">
          <p className="text-[11px] text-muted-foreground">Impact data linked to specific production runs. This feeds into per-garment DPP calculations.</p>
          {overview.byCategory.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {overview.byCategory.map((c) => {
                const cat = CATEGORIES.find((x) => x.value === c.category);
                return (
                  <div key={c.category} className="bg-card border border-border rounded-xl p-4">
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{cat?.label || c.category}</p>
                    <p className="text-[20px] font-bold tabular-nums text-foreground">{c.totalValue < 10 ? c.totalValue.toFixed(1) : Math.round(c.totalValue).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{cat?.unit} · {c.count ?? 0} records</p>
                  </div>
                );
              })}
            </div>
          )}
          {records.filter((r) => r.scope === "PRODUCTION_RUN").length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {records.filter((r) => r.scope === "PRODUCTION_RUN").map((r) => {
                  const cat = CATEGORIES.find((c) => c.value === r.category);
                  const statusDisplay = STATUS_DISPLAY[r.status] || STATUS_DISPLAY.DRAFT;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-foreground">{cat?.label || r.category}</span>
                          <Badge label={statusDisplay.label} bgClass={statusDisplay.bgClass} textClass={statusDisplay.textClass} />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{r.productionRun?.runCode || "No run"} · {r.period || "—"}</p>
                      </div>
                      <span className="text-[14px] font-bold font-mono-brand tabular-nums">{r.value < 10 ? r.value.toFixed(1) : Math.round(r.value).toLocaleString()}</span>
                      <span className="text-[10px] text-muted-foreground">{r.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Leaf size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-[11px] text-muted-foreground">No run-level impact data yet. Add records with scope &ldquo;Production Run&rdquo;.</p>
            </div>
          )}
        </div>
      )}

      {/* All Records tab */}
      {activeTab === "records" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">All Records ({records.length})</h3>
          </div>
          {records.length > 0 ? (
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {records.map((r) => {
                const cat = CATEGORIES.find((c) => c.value === r.category);
                const statusDisplay = STATUS_DISPLAY[r.status] || STATUS_DISPLAY.DRAFT;
                return (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-foreground">{cat?.label || r.category}</span>
                        <Badge label={statusDisplay.label} bgClass={statusDisplay.bgClass} textClass={statusDisplay.textClass} />
                        <Badge label={r.scope === "FACILITY" ? "Facility" : "Run"} bgClass="bg-badge-purple-bg" textClass="text-badge-purple-text" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {r.productionRun ? `Run: ${r.productionRun.runCode}` : "Facility"} · {r.period || "—"}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold font-mono-brand tabular-nums">{r.value < 10 ? r.value.toFixed(1) : Math.round(r.value).toLocaleString()}</span>
                    <span className="text-[10px] text-muted-foreground">{r.unit}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Leaf size={24} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-[11px] text-muted-foreground">No impact data submitted yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
