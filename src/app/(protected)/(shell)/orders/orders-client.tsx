"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ChevronRight, ClipboardList, Building2, Upload, FileSpreadsheet, CheckCircle, AlertTriangle } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { createOrder, updateOrder } from "@/lib/actions/orders";
import type { POParseResult } from "@/lib/actions/po-import";
import type { ParsedPOPdf } from "@/lib/actions/po-pdf-parser";

type OrderWithCount = {
  id: number;
  orderRef: string;
  status: string;
  supplierId: number | null;
  manufacturer: string | null;
  client: string | null;
  dueDate: string | null;
  totalQuantity: number;
  priority: number;
  notes: string | null;
  createdAt: string;
  supplier: { id: number; name: string } | null;
  _count: { orderLines: number };
};

type SupplierOption = { id: number; name: string; type: string };

export function OrdersClient({
  initialOrders,
  materials,
  suppliers,
  isAdmin,
  showUploadOnLoad,
}: {
  initialOrders: OrderWithCount[];
  materials: { id: number; name: string; hexValue: string | null }[];
  suppliers: SupplierOption[];
  isAdmin: boolean;
  showUploadOnLoad?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [newRef, setNewRef] = useState("");
  const [newClient, setNewClient] = useState("");
  const [newSupplierId, setNewSupplierId] = useState<number | null>(null);
  const [newQty, setNewQty] = useState(0);
  const [newDueDate, setNewDueDate] = useState("");

  // PO upload — supports both Excel and PDF
  const [showPOUpload, setShowPOUpload] = useState(false);
  const [poPreview, setPOPreview] = useState<POParseResult | null>(null);
  const [poPdfPreview, setPOPdfPreview] = useState<ParsedPOPdf | null>(null);
  const [poImportResult, setPOImportResult] = useState<{ orderRef: string; supplierMatched: string | null; supplierNotFound: string | null; linesCreated: number; totalQty: number; totalAmount?: number } | null>(null);
  const [poError, setPOError] = useState<string | null>(null);
  const [poDragging, setPoDragging] = useState(false);

  useEffect(() => {
    if (showUploadOnLoad) setShowPOUpload(true);
  }, [showUploadOnLoad]);

  function handlePODrop(e: React.DragEvent) {
    e.preventDefault();
    setPoDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".pdf") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      processPOFile(file);
    } else {
      setPOError("Please drop a PDF or Excel file");
    }
  }

  async function handlePOFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processPOFile(file);
  }

  async function processPOFile(file: File) {
    setPOError(null);
    setPOPreview(null);
    setPOPdfPreview(null);
    setPOImportResult(null);

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      try {
        if (isPdf) {
          // Parse PDF PO
          const res = await fetch("/api/po/parse-pdf", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success) {
            setPOPdfPreview(data.data);
          } else {
            setPOError(data.error || "Failed to parse PO PDF");
          }
        } else {
          // Parse Excel PO
          formData.append("action", "preview");
          const res = await fetch("/api/po/upload", { method: "POST", body: formData });
          const data = await res.json();
          if (data.success) {
            setPOPreview(data.data);
          } else {
            setPOError(data.error || "Failed to parse PO file");
          }
        }
      } catch {
        setPOError("Upload failed");
      }
    });
  }

  async function handlePOImport() {
    setPOError(null);

    startTransition(async () => {
      try {
        if (poPdfPreview) {
          // Import PDF PO
          const { importPOPdf } = await import("@/lib/actions/po-pdf-parser");
          const result = await importPOPdf(poPdfPreview);
          if (result.success && result.data) {
            router.push(`/orders/${result.data.orderId}`);
          } else {
            setPOError(result.error || "Import failed");
          }
          return;
        }

        if (!poPreview) return;
        const { importPO } = await import("@/lib/actions/po-import");
        const result = await importPO(poPreview);
        if (result.success && result.data) {
          router.push(`/orders/${result.data.orderId}`);
        } else {
          setPOError(result.error || "Import failed");
        }
      } catch {
        setPOError("Import failed");
      }
    });
  }

  const statuses = ["ALL", ...Object.keys(ORDER_STATUS_DISPLAY)];

  const filtered = initialOrders.filter((o) => {
    const matchSearch =
      o.orderRef.toLowerCase().includes(search.toLowerCase()) ||
      (o.client && o.client.toLowerCase().includes(search.toLowerCase())) ||
      (o.supplier?.name && o.supplier.name.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "ALL" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleCreate() {
    if (!newRef.trim()) return;
    startTransition(async () => {
      const result = await createOrder({
        orderRef: newRef.trim(),
        client: newClient || null,
        supplierId: newSupplierId,
        totalQuantity: newQty,
        dueDate: newDueDate || null,
      });
      setNewRef("");
      setNewClient("");
      setNewSupplierId(null);
      setNewQty(0);
      setNewDueDate("");
      setShowCreate(false);
      if (result.success && result.data) {
        router.push(`/orders/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  async function handleAssignSupplier(orderId: number, supplierId: number | null) {
    startTransition(async () => {
      await updateOrder(orderId, { supplierId });
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Orders</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">
            {isAdmin ? "All Orders" : "My Orders"}
          </h1>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowPOUpload(!showPOUpload); setShowCreate(false); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              <Upload size={14} /> Upload PO
            </button>
            <button
              onClick={() => { setShowCreate(!showCreate); setShowPOUpload(false); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white transition-colors"
              style={{ backgroundColor: "hsl(217 91% 60%)" }}
            >
              <Plus size={14} /> Manual Order
            </button>
          </div>
        )}
      </div>

      {/* Create form */}
      {/* PO Upload */}
      {showPOUpload && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-3">Upload Purchase Order</h3>
          <p className="text-[10px] text-muted-foreground mb-4">
            Upload a Sheep Inc PO Excel file (.xlsx). The system will extract the PO number, supplier, SKUs, and quantities automatically.
          </p>

          {/* File picker */}
          {!poPreview && !poPdfPreview && !poImportResult && (
            <label
              className={`flex flex-col items-center justify-center gap-3 px-5 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                poDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-foreground/30"
              }`}
              onDragOver={(e) => { e.preventDefault(); setPoDragging(true); }}
              onDragLeave={() => setPoDragging(false)}
              onDrop={handlePODrop}
            >
              {isPending ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  <span className="text-[12px] text-muted-foreground">Parsing file...</span>
                </div>
              ) : (
                <>
                  <FileSpreadsheet size={28} className={poDragging ? "text-primary" : "text-muted-foreground"} />
                  <div className="text-center">
                    <p className="text-[12px] font-medium text-foreground">{poDragging ? "Drop file here" : "Drag & drop Purchase Order"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">or click to browse · PDF or Excel (.pdf, .xlsx)</p>
                  </div>
                </>
              )}
              <input type="file" accept=".xlsx,.xls,.pdf" onChange={handlePOFile} className="hidden" disabled={isPending} />
            </label>
          )}

          {/* PDF PO Preview */}
          {poPdfPreview && (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">PO Number</p>
                    <p className="text-[13px] font-bold text-foreground">{poPdfPreview.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Supplier</p>
                    <p className="text-[13px] font-semibold text-foreground">{poPdfPreview.supplierName || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Lines</p>
                    <p className="text-[13px] font-bold font-mono-brand text-foreground">{poPdfPreview.lines.length}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Total Qty</p>
                    <p className="text-[13px] font-bold font-mono-brand text-foreground">{poPdfPreview.lines.reduce((s, l) => s + l.quantity, 0)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Total Value</p>
                    <p className="text-[13px] font-bold font-mono-brand text-foreground">{poPdfPreview.currency} {poPdfPreview.totalAmount.toLocaleString()}</p>
                  </div>
                </div>

                {poPdfPreview.lines.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                    <table className="w-full text-[10px]">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">SKU</th>
                          <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Product</th>
                          <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Colour</th>
                          <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Size</th>
                          <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Qty</th>
                          <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Price</th>
                          <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {poPdfPreview.lines.map((l, i) => (
                          <tr key={i} className="hover:bg-secondary/20">
                            <td className="px-3 py-1.5 font-mono-brand text-foreground">{l.sku}</td>
                            <td className="px-3 py-1.5 text-foreground">{l.productName}</td>
                            <td className="px-3 py-1.5 text-foreground">{l.colour}</td>
                            <td className="px-3 py-1.5 text-foreground">{l.size}</td>
                            <td className="px-3 py-1.5 font-mono-brand text-foreground text-right tabular-nums">{l.quantity}</td>
                            <td className="px-3 py-1.5 font-mono-brand text-muted-foreground text-right tabular-nums">{l.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-1.5 font-mono-brand text-foreground text-right tabular-nums">{l.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {poPdfPreview.lines.length === 0 && (
                  <p className="text-[11px] text-badge-orange-text">Could not parse line items from this PDF format.</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button onClick={handlePOImport} disabled={isPending || poPdfPreview.lines.length === 0} className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50">
                  {isPending ? "Importing..." : "Import PO"}
                </button>
                <button onClick={() => { setPOPdfPreview(null); setPOError(null); }} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
            </div>
          )}

          {/* Excel PO Preview */}
          {poPreview && (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">PO Number</p>
                    <p className="text-[13px] font-bold text-foreground">{poPreview.header.parentPO}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Supplier</p>
                    <p className="text-[13px] font-semibold text-foreground">{poPreview.header.supplierName}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Line Items</p>
                    <p className="text-[13px] font-bold font-mono-brand text-foreground">{poPreview.lines.length}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Total Qty</p>
                    <p className="text-[13px] font-bold font-mono-brand text-foreground">{poPreview.totalQty}</p>
                  </div>
                </div>

                {/* Line preview */}
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                  <table className="w-full text-[10px]">
                    <thead className="bg-secondary/50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Style</th>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">SKU</th>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Colour</th>
                        <th className="text-left px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Size</th>
                        <th className="text-right px-3 py-1.5 font-mono-brand uppercase tracking-wider text-muted-foreground">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {poPreview.lines.slice(0, 20).map((line, i) => (
                        <tr key={i} className="hover:bg-secondary/20">
                          <td className="px-3 py-1.5 text-foreground">{line.style}</td>
                          <td className="px-3 py-1.5 font-mono-brand text-muted-foreground">{line.sku}</td>
                          <td className="px-3 py-1.5 text-foreground">{line.productColor}</td>
                          <td className="px-3 py-1.5 text-foreground">{line.size}</td>
                          <td className="px-3 py-1.5 font-mono-brand text-foreground text-right tabular-nums">{line.orderQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {poPreview.lines.length > 20 && (
                    <p className="px-3 py-1.5 text-[9px] text-muted-foreground">...and {poPreview.lines.length - 20} more lines</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePOImport}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {isPending ? "Importing..." : "Import PO"}
                </button>
                <button onClick={() => { setPOPreview(null); setPOError(null); }} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Import result */}
          {poImportResult && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-badge-green-bg/50 border border-badge-green-text/20">
              <CheckCircle size={16} className="text-badge-green-text shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-semibold text-foreground mb-1">PO Imported Successfully</p>
                <p className="text-[11px] text-muted-foreground">
                  <strong>{poImportResult.orderRef}</strong> — {poImportResult.linesCreated} lines, {poImportResult.totalQty} total units
                </p>
                {poImportResult.supplierMatched && (
                  <p className="text-[10px] text-badge-green-text mt-1">✓ Auto-assigned to supplier: {poImportResult.supplierMatched}</p>
                )}
                {poImportResult.supplierNotFound && (
                  <p className="text-[10px] text-badge-orange-text mt-1">⚠ Supplier &quot;{poImportResult.supplierNotFound}&quot; not found — assign manually</p>
                )}
                <button onClick={() => { setPOImportResult(null); setShowPOUpload(false); }} className="text-[10px] text-primary hover:underline mt-2 inline-block">Done</button>
              </div>
            </div>
          )}

          {/* Error */}
          {poError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-badge-red-bg text-badge-red-text mt-3">
              <AlertTriangle size={14} />
              <span className="text-[11px] font-medium">{poError}</span>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">New Order</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Order / PO Ref *</label>
              <input value={newRef} onChange={(e) => setNewRef(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="PO-2026-001" />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Assign Supplier</label>
              <select value={newSupplierId ?? ""} onChange={(e) => setNewSupplierId(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="">— Unassigned —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Client</label>
              <input value={newClient} onChange={(e) => setNewClient(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Sheep Inc." />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Due Date</label>
              <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleCreate} disabled={isPending || !newRef.trim()} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors">
              {isPending ? "Creating..." : "Create Order"}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Search + status filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search orders, suppliers..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-[12px] text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5 overflow-x-auto">
          {statuses.slice(0, 5).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-2.5 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${statusFilter === s ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "ALL" ? "All" : ORDER_STATUS_DISPLAY[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-4">{filtered.length} order{filtered.length !== 1 ? "s" : ""}</p>

      {/* Order list */}
      <div className="space-y-2">
        {filtered.map((order) => (
          <div key={order.id} className="bg-card border border-border rounded-xl overflow-hidden">
            <Link href={`/orders/${order.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors group">
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
              <div className="hidden sm:flex items-center gap-2">
                {order.supplier ? (
                  <Badge label={order.supplier.name} bgClass="bg-badge-blue-bg" textClass="text-badge-blue-text" />
                ) : (
                  <Badge label="Unassigned" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                )}
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[14px] font-bold font-mono-brand text-foreground tabular-nums">{order.totalQuantity.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">units</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>

            {/* Inline supplier assignment for unassigned orders (admin only) */}
            {isAdmin && !order.supplier && (
              <div className="px-5 py-2.5 border-t border-border bg-badge-orange-bg/30 flex items-center gap-3">
                <Building2 size={12} className="text-badge-orange-text shrink-0" />
                <span className="text-[10px] text-badge-orange-text font-medium">Assign supplier:</span>
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) handleAssignSupplier(order.id, parseInt(e.target.value)); }}
                  disabled={isPending}
                  className="flex-1 max-w-xs px-2.5 py-1 bg-card border border-border rounded-lg text-[11px] text-foreground outline-none"
                >
                  <option value="">Select...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                </select>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <ClipboardList size={24} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-[13px] font-semibold text-foreground mb-1">No orders found</p>
            <p className="text-[11px] text-muted-foreground">{search || statusFilter !== "ALL" ? "Try different filters" : "Create your first order to get started"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
