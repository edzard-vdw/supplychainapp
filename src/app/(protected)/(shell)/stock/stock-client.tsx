"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, Trash2, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { createMaterial, updateMaterial, deleteMaterial } from "@/lib/actions/materials";

type ColourRow = {
  id: number;
  name: string;
  colorCode: string | null;
  hexValue: string | null;
  yarnType: string | null;
  manufacturer: string | null;
  stockWeightKg: number;
  remainingKg: number;
  isActive: boolean;
  _count: { orderLines: number; garments: number };
};

type DeliveryLine = { colourCode: string; colourName: string; remainingKg: number; netKg: number };
type Delivery = {
  id: number;
  deliveryNoteRef: string;
  status: string;
  supplier: { id: number; name: string } | null;
  lines: DeliveryLine[];
};

export function StockClient({ colours: initialColours, deliveries }: { colours: ColourRow[]; deliveries: Delivery[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [colours, setColours] = useState<ColourRow[]>(initialColours);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<number | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addHex, setAddHex] = useState("");
  const [addYarnType, setAddYarnType] = useState("");
  const [addManufacturer, setAddManufacturer] = useState("");
  const [addStockKg, setAddStockKg] = useState("");

  // Edit inline state
  const [editValues, setEditValues] = useState<Partial<ColourRow>>({});

  // Total stock across all colours
  const totalStockKg = colours.filter(c => c.isActive).reduce((s, c) => s + c.stockWeightKg, 0);
  const totalRemainingKg = colours.filter(c => c.isActive).reduce((s, c) => s + c.remainingKg, 0);

  // Supplier yarn holdings grouped
  const supplierHoldings = new Map<string, { supplier: { id: number; name: string }; totalKg: number; byColour: Map<string, number> }>();
  for (const d of deliveries) {
    if (!d.supplier) continue;
    const key = String(d.supplier.id);
    if (!supplierHoldings.has(key)) {
      supplierHoldings.set(key, { supplier: d.supplier, totalKg: 0, byColour: new Map() });
    }
    const entry = supplierHoldings.get(key)!;
    for (const line of d.lines) {
      if (line.remainingKg > 0) {
        entry.totalKg += line.remainingKg;
        entry.byColour.set(line.colourCode, (entry.byColour.get(line.colourCode) ?? 0) + line.remainingKg);
      }
    }
  }

  function handleAdd() {
    if (!addName.trim()) return;
    startTransition(async () => {
      const result = await createMaterial({
        name: addName.trim(),
        colorCode: addCode.trim() || null,
        hexValue: addHex.trim() || null,
        yarnType: addYarnType.trim() || null,
        manufacturer: addManufacturer.trim() || null,
        stockWeightKg: parseFloat(addStockKg) || 0,
        remainingKg: parseFloat(addStockKg) || 0,
      });
      if (result.success && result.data) {
        setColours(prev => [...prev, { ...(result.data as unknown as ColourRow), _count: { orderLines: 0, garments: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
        setAddName(""); setAddCode(""); setAddHex(""); setAddYarnType(""); setAddManufacturer(""); setAddStockKg("");
        setShowAdd(false);
      }
    });
  }

  function startEdit(c: ColourRow) {
    setEditId(c.id);
    setEditValues({ name: c.name, colorCode: c.colorCode, hexValue: c.hexValue, yarnType: c.yarnType, manufacturer: c.manufacturer, stockWeightKg: c.stockWeightKg, remainingKg: c.remainingKg });
  }

  function saveEdit(id: number) {
    startTransition(async () => {
      await updateMaterial(id, { name: editValues.name, colorCode: editValues.colorCode, hexValue: editValues.hexValue, yarnType: editValues.yarnType, manufacturer: editValues.manufacturer, stockWeightKg: editValues.stockWeightKg, remainingKg: editValues.remainingKg });
      setColours(prev => prev.map(c => c.id === id ? { ...c, ...editValues } : c));
      setEditId(null);
    });
  }

  function handleDelete(id: number) {
    if (!confirm("Archive this colour? It will no longer appear in stock.")) return;
    startTransition(async () => {
      await deleteMaterial(id);
      setColours(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c));
      router.refresh();
    });
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    const text = await file.text();
    const lines = text.trim().split("\n").slice(1); // skip header
    let imported = 0;
    for (const line of lines) {
      const cols = line.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
      const [name, colorCode, hexValue, yarnType, manufacturer, stockKg] = cols;
      if (!name) continue;
      const result = await createMaterial({
        name, colorCode: colorCode || null, hexValue: hexValue || null,
        yarnType: yarnType || null, manufacturer: manufacturer || null,
        stockWeightKg: parseFloat(stockKg) || 0, remainingKg: parseFloat(stockKg) || 0,
      });
      if (result.success) imported++;
    }
    router.refresh();
    if (imported === 0) setCsvError("No rows imported — check CSV format");
    e.target.value = "";
  }

  const activeColours = colours.filter(c => c.isActive);

  return (
    <div className="px-6 py-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Admin</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Yarn Stock</h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Colours</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{activeColours.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Total Stock</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{totalStockKg.toFixed(1)} <span className="text-[12px] font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Remaining</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{totalRemainingKg.toFixed(1)} <span className="text-[12px] font-normal text-muted-foreground">kg</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">At Suppliers</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">
            {Array.from(supplierHoldings.values()).reduce((s, h) => s + h.totalKg, 0).toFixed(1)} <span className="text-[12px] font-normal text-muted-foreground">kg</span>
          </p>
        </div>
      </div>

      {/* Colour codes table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Colour Codes</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-[10px] font-semibold uppercase tracking-wider hover:bg-secondary/70 cursor-pointer transition-colors">
              <Upload size={12} /> CSV Import
              <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" disabled={isPending} />
            </label>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider hover:bg-foreground/90 transition-colors"
            >
              <Plus size={12} /> Add Colour
            </button>
          </div>
        </div>

        {csvError && (
          <div className="px-5 py-2 bg-badge-red-bg text-badge-red-text text-[11px]">{csvError}</div>
        )}

        {/* CSV format hint */}
        <div className="px-5 py-2 bg-secondary/10 border-b border-border">
          <p className="text-[9px] text-muted-foreground font-mono-brand">CSV format: name, colour_code, hex_value, yarn_type, manufacturer, stock_kg</p>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="px-5 py-4 border-b border-border bg-secondary/10">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
              <div className="sm:col-span-2">
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Name *</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Oatmeal" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Colour Code</label>
                <input value={addCode} onChange={e => setAddCode(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="OAT-001" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Hex</label>
                <div className="flex items-center gap-1.5">
                  {addHex && <div className="w-6 h-6 rounded border border-border shrink-0" style={{ backgroundColor: addHex }} />}
                  <input value={addHex} onChange={e => setAddHex(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="#F5E6C8" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Yarn Type</label>
                <input value={addYarnType} onChange={e => setAddYarnType(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Merino" />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Stock (kg)</label>
                <input type="number" step="0.1" min="0" value={addStockKg} onChange={e => setAddStockKg(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" placeholder="0.0" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={isPending || !addName.trim()} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">Add</button>
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
            </div>
          </div>
        )}

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 px-5 py-2 border-b border-border bg-secondary/20">
          {["Name", "Code", "Type", "Manufacturer", "Total kg", "Remaining kg", ""].map(h => (
            <p key={h} className="text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground">{h}</p>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border">
          {activeColours.map(c => (
            <div key={c.id} className="px-5 py-3">
              {editId === c.id ? (
                <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                  <input value={editValues.name ?? ""} onChange={e => setEditValues(v => ({ ...v, name: e.target.value }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" />
                  <input value={editValues.colorCode ?? ""} onChange={e => setEditValues(v => ({ ...v, colorCode: e.target.value || null }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Code" />
                  <input value={editValues.yarnType ?? ""} onChange={e => setEditValues(v => ({ ...v, yarnType: e.target.value || null }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Type" />
                  <input value={editValues.manufacturer ?? ""} onChange={e => setEditValues(v => ({ ...v, manufacturer: e.target.value || null }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Manufacturer" />
                  <input type="number" step="0.1" value={editValues.stockWeightKg ?? 0} onChange={e => setEditValues(v => ({ ...v, stockWeightKg: parseFloat(e.target.value) || 0 }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
                  <input type="number" step="0.1" value={editValues.remainingKg ?? 0} onChange={e => setEditValues(v => ({ ...v, remainingKg: parseFloat(e.target.value) || 0 }))} className="px-2 py-1 bg-background border border-border rounded text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
                  <div className="flex items-center gap-1">
                    <button onClick={() => saveEdit(c.id)} disabled={isPending} className="p-1.5 rounded text-badge-green-text hover:bg-badge-green-bg/30 transition-colors"><Check size={13} /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"><X size={13} /></button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
                  <div className="flex items-center gap-2">
                    {c.hexValue && <div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: c.hexValue }} />}
                    <span className="text-[12px] font-semibold text-foreground truncate">{c.name}</span>
                  </div>
                  <span className="text-[10px] font-mono-brand text-muted-foreground">{c.colorCode || "—"}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{c.yarnType || "—"}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{c.manufacturer || "—"}</span>
                  <span className="text-[11px] font-mono-brand font-bold text-foreground tabular-nums">{c.stockWeightKg.toFixed(1)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono-brand tabular-nums" style={{ color: c.remainingKg < c.stockWeightKg * 0.2 ? "hsl(0 72% 51%)" : "hsl(142 76% 36%)" }}>{c.remainingKg.toFixed(1)}</span>
                    {c.stockWeightKg > 0 && (
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block min-w-[40px]">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (c.remainingKg / c.stockWeightKg) * 100)}%`, backgroundColor: "hsl(142 76% 36%)" }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(c)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(c.id)} disabled={isPending} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {activeColours.length === 0 && (
            <p className="px-5 py-8 text-[12px] text-muted-foreground text-center">No colours yet — add one above or import a CSV</p>
          )}
        </div>
      </div>

      {/* Yarn at suppliers */}
      {supplierHoldings.size > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Yarn at Suppliers</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Stock held at each supplier based on delivery notes they have logged</p>
          </div>
          <div className="divide-y divide-border">
            {Array.from(supplierHoldings.values()).map(({ supplier, totalKg, byColour }) => (
              <div key={supplier.id}>
                <button
                  onClick={() => setExpandedSupplier(expandedSupplier === supplier.id ? null : supplier.id)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-secondary/20 transition-colors text-left"
                >
                  <span className="text-[12px] font-semibold text-foreground">{supplier.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono-brand font-bold tabular-nums text-foreground">{totalKg.toFixed(1)} kg</span>
                    {expandedSupplier === supplier.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>
                {expandedSupplier === supplier.id && (
                  <div className="px-5 pb-3 border-t border-border bg-secondary/10">
                    <div className="mt-3 space-y-1">
                      {Array.from(byColour.entries()).map(([code, kg]) => (
                        <div key={code} className="flex items-center justify-between py-1">
                          <span className="text-[10px] font-mono-brand text-muted-foreground">{code}</span>
                          <span className="text-[10px] font-mono-brand font-bold tabular-nums text-foreground">{kg.toFixed(2)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
