"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Package, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { Badge } from "@/components/ui/badge";
import { importDeliveryNote, confirmDelivery, updateYarnDeliveryLine, type ParsedDeliveryNote } from "@/lib/actions/yarn-deliveries";

type LotDetail = {
  lineId: number;
  lotNumber: string;
  deliveryRef: string;
  deliveryId: number;
  cones: number;
  totalKg: number;
  remainingKg: number;
  composition: string;
  yarnType: string;
};

type ColourStock = {
  colourCode: string;
  colourName: string;
  totalKg: number;
  remainingKg: number;
  totalCones: number;
  lots: LotDetail[];
};

type Delivery = {
  id: number;
  deliveryNoteRef: string;
  yarnMill: string | null;
  status: string;
  totalCones: number;
  totalNetKg: number;
  supplier: { name: string } | null;
  lines: { id: number; colourCode: string; colourName: string | null; lotNumber: string | null; cones: number; netKg: number; condKg: number | null; remainingKg: number }[];
};

const STATUS_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = {
  PENDING: { label: "Pending", bgClass: "bg-badge-orange-bg", textClass: "text-badge-orange-text" },
  CONFIRMED: { label: "Confirmed", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
};

export function MaterialsPageClient({
  yarnStock,
  deliveries: initialDeliveries,
  supplierId,
}: {
  yarnStock: ColourStock[];
  deliveries: Delivery[];
  supplierId: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showUpload, setShowUpload] = useState(false);
  const [parsedNote, setParsedNote] = useState<ParsedDeliveryNote | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [expandedColour, setExpandedColour] = useState<string | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<number | null>(null);
  const [editingLotId, setEditingLotId] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  // Upload
  async function processFile(file: File) {
    setUploadError(null);
    setParsedNote(null);
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      try {
        const res = await fetch("/api/yarn/parse", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) setParsedNote(data.data);
        else setUploadError(data.error || "Failed to parse");
      } catch { setUploadError("Upload failed"); }
    });
  }

  async function handleImport() {
    if (!parsedNote) return;
    startTransition(async () => {
      const result = await importDeliveryNote(parsedNote, supplierId || undefined);
      if (result.success) { setParsedNote(null); setShowUpload(false); setUploadError(null); router.refresh(); }
      else setUploadError(result.error || "Import failed");
    });
  }

  function handleConfirm(deliveryId: number) {
    startTransition(async () => { await confirmDelivery(deliveryId, 0); router.refresh(); });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".pdf")) processFile(file);
    else setUploadError("Please drop a PDF file");
  }

  function handleLotUpdate(lineId: number, field: string, value: string | number) {
    startTransition(async () => {
      await updateYarnDeliveryLine(lineId, { [field]: value });
      setEditingLotId(null);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Materials</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Yarn Stock</h1>
        </div>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-colors">
          <Upload size={14} /> Upload Delivery Note
        </button>
      </div>

      {/* Upload */}
      {showUpload && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-3">Upload Yarn Delivery Note</h3>
          {!parsedNote ? (
            <label className={`flex flex-col items-center justify-center gap-3 px-5 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}>
              {isPending ? (
                <div className="flex items-center gap-3"><div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" /><span className="text-[12px] text-muted-foreground">Parsing PDF...</span></div>
              ) : (
                <><Package size={28} className={dragging ? "text-primary" : "text-muted-foreground"} /><p className="text-[12px] font-medium text-foreground">{dragging ? "Drop PDF here" : "Drag & drop delivery note PDF"}</p><p className="text-[10px] text-muted-foreground">or click to browse</p></>
              )}
              <input type="file" accept=".pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" disabled={isPending} />
            </label>
          ) : (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div><p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Delivery Note</p><p className="text-[13px] font-bold text-foreground">{parsedNote.deliveryNoteRef}</p></div>
                  <div><p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Supplier</p><p className="text-[13px] font-semibold text-foreground">{parsedNote.supplierName || "Unknown"}</p></div>
                  <div><p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Colours</p><p className="text-[13px] font-bold font-mono-brand">{parsedNote.lines.length}</p></div>
                  <div><p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Total</p><p className="text-[13px] font-bold font-mono-brand">{parsedNote.totalNetKg} kg</p></div>
                </div>
                {parsedNote.lines.length > 0 && (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/50"><tr>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Code</th>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Colour</th>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Lot</th>
                        <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Cond kg</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">
                        {parsedNote.lines.map((l, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-mono-brand font-bold text-foreground">{l.colourCode}</td>
                            <td className="px-3 py-1.5 text-foreground">{l.sheepIncName || <span className="italic text-muted-foreground">{l.colourName}</span>}</td>
                            <td className="px-3 py-1.5 font-mono-brand text-muted-foreground">{l.lotNumber || "—"}</td>
                            <td className="px-3 py-1.5 font-mono-brand text-foreground text-right">{l.netKg}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={handleImport} disabled={isPending} className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">{isPending ? "Importing..." : "Import Delivery"}</button>
                <button onClick={() => { setParsedNote(null); setUploadError(null); }} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}
          {uploadError && (<div className="flex items-center gap-2 p-3 rounded-lg bg-badge-red-bg text-badge-red-text mt-3"><AlertTriangle size={14} /><span className="text-[11px] font-medium">{uploadError}</span></div>)}
        </div>
      )}

      {/* ─── Yarn Stock by Colour ─── */}
      {yarnStock.length > 0 ? (
        <div className="mb-8">
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">
            Yarn Stock <span className="text-muted-foreground font-normal">({yarnStock.length} colours)</span>
          </h2>
          <div className="space-y-2">
            {yarnStock.map((colour) => {
              const isExpanded = expandedColour === colour.colourCode;
              const usedPct = colour.totalKg > 0 ? ((colour.totalKg - colour.remainingKg) / colour.totalKg) * 100 : 0;
              return (
                <div key={colour.colourCode} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Colour summary row */}
                  <button
                    onClick={() => setExpandedColour(isExpanded ? null : colour.colourCode)}
                    className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="w-12 shrink-0">
                      <p className="text-[12px] font-mono-brand font-bold text-primary">{colour.colourCode}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-foreground">{colour.colourName}</p>
                      <p className="text-[9px] text-muted-foreground">{colour.lots.length} lot{colour.lots.length !== 1 ? "s" : ""} · {colour.totalCones} cone{colour.totalCones !== 1 ? "s" : ""}</p>
                    </div>
                    {/* Stock bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1 w-36">
                      <span className="text-[10px] font-mono-brand tabular-nums">
                        <span className={`font-bold ${usedPct > 80 ? "text-badge-red-text" : usedPct > 50 ? "text-badge-orange-text" : "text-foreground"}`}>{colour.remainingKg.toFixed(2)}</span>
                        <span className="text-muted-foreground"> / {colour.totalKg.toFixed(2)} kg</span>
                      </span>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(100 - usedPct, 0)}%`, backgroundColor: usedPct > 80 ? "hsl(0 72% 51%)" : usedPct > 50 ? "hsl(45 93% 47%)" : "hsl(142 76% 36%)" }} />
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </button>

                  {/* Expanded: individual lots */}
                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/10">
                      <table className="w-full text-[10px]">
                        <thead className="bg-secondary/30">
                          <tr>
                            <th className="text-left px-5 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Lot</th>
                            <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Delivery</th>
                            <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Yarn Type</th>
                            <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Cones</th>
                            <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Total kg</th>
                            <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Remaining</th>
                            <th className="text-right px-5 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Edit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {colour.lots.map((lot) => {
                            const isEditing = editingLotId === lot.lineId;
                            const lotUsedPct = lot.totalKg > 0 ? ((lot.totalKg - lot.remainingKg) / lot.totalKg) * 100 : 0;
                            return (
                              <tr key={lot.lineId} className="hover:bg-secondary/20">
                                <td className="px-5 py-2">
                                  {isEditing ? (
                                    <input defaultValue={lot.lotNumber} onBlur={(e) => handleLotUpdate(lot.lineId, "lotNumber", e.target.value)} className="w-20 px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono-brand outline-none focus:ring-1 focus:ring-ring" autoFocus />
                                  ) : (
                                    <span className="font-mono-brand font-bold text-foreground">{lot.lotNumber}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono-brand text-muted-foreground">{lot.deliveryRef}</td>
                                <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]">{lot.yarnType || "—"}</td>
                                <td className="px-3 py-2 font-mono-brand text-foreground text-right tabular-nums">
                                  {isEditing ? (
                                    <input type="number" defaultValue={lot.cones} onBlur={(e) => handleLotUpdate(lot.lineId, "cones", parseInt(e.target.value))} className="w-12 px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono-brand text-right outline-none" />
                                  ) : lot.cones}
                                </td>
                                <td className="px-3 py-2 font-mono-brand text-muted-foreground text-right tabular-nums">{lot.totalKg.toFixed(2)}</td>
                                <td className="px-3 py-2 text-right">
                                  {isEditing ? (
                                    <input type="number" step="0.01" defaultValue={lot.remainingKg} onBlur={(e) => handleLotUpdate(lot.lineId, "remainingKg", parseFloat(e.target.value))} className="w-16 px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono-brand text-right outline-none" />
                                  ) : (
                                    <span className={`font-mono-brand font-bold tabular-nums ${lotUsedPct > 80 ? "text-badge-red-text" : "text-foreground"}`}>{lot.remainingKg.toFixed(2)} kg</span>
                                  )}
                                </td>
                                <td className="px-5 py-2 text-right">
                                  <button onClick={() => setEditingLotId(isEditing ? null : lot.lineId)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil size={11} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        !showUpload && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl mb-8">
            <Package size={24} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-[13px] font-semibold text-foreground mb-1">No yarn stock</p>
            <p className="text-[11px] text-muted-foreground mb-4">Upload a Suedwolle delivery note to start tracking your yarn</p>
            <button onClick={() => setShowUpload(true)} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider">Upload Delivery Note</button>
          </div>
        )
      )}

      {/* ─── Delivery Notes ─── */}
      {initialDeliveries.length > 0 && (
        <div>
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Delivery Notes ({initialDeliveries.length})</h2>
          <div className="space-y-2">
            {initialDeliveries.map((d) => {
              const isExpanded = expandedDeliveryId === d.id;
              const statusInfo = STATUS_DISPLAY[d.status] || STATUS_DISPLAY.PENDING;
              return (
                <div key={d.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedDeliveryId(isExpanded ? null : d.id)} className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-secondary/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-[12px] font-semibold text-foreground">{d.deliveryNoteRef}</p>
                        <Badge label={statusInfo.label} bgClass={statusInfo.bgClass} textClass={statusInfo.textClass} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{d.yarnMill || "—"} · {d.lines.length} colour{d.lines.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-[13px] font-bold font-mono-brand tabular-nums">{d.totalNetKg} kg</p>
                      <p className="text-[9px] text-muted-foreground">{d.totalCones} cones</p>
                    </div>
                    {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-5 py-4 bg-secondary/20 space-y-3">
                      {d.status === "PENDING" && (
                        <button onClick={() => handleConfirm(d.id)} disabled={isPending} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-badge-green-text text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">
                          <CheckCircle size={14} /> Confirm Delivery Received
                        </button>
                      )}
                      <div className="space-y-1">
                        {d.lines.map((l) => (
                          <div key={l.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                            <span className="text-[10px] font-mono-brand font-bold text-primary w-16">{l.colourCode}</span>
                            <span className="text-[10px] text-foreground flex-1">{l.colourName || "—"}</span>
                            <span className="text-[9px] font-mono-brand text-muted-foreground">{l.lotNumber || "—"}</span>
                            <span className="text-[10px] font-mono-brand text-foreground tabular-nums">{(l.condKg || l.netKg).toFixed(2)} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ContextualHelp
        pageId="materials"
        title="Yarn & Materials"
        steps={[
          { icon: "📄", text: "When yarn arrives, upload the delivery note PDF" },
          { icon: "✅", text: "Review the parsed data, then confirm the delivery" },
          { icon: "🧶", text: "Your yarn stock updates automatically by colour and lot" },
          { icon: "🔗", text: "When creating production runs, link them to a yarn lot" },
        ]}
        tip="Tap a colour row to see individual lots with remaining stock."
      />
    </div>
  );
}
