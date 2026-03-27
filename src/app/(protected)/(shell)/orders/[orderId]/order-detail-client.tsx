"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Trash2, Upload, FileSpreadsheet, Pencil, History, CheckCircle } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ORDER_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { updateOrder, deleteOrder, createOrderLine, deleteOrderLine } from "@/lib/actions/orders";
import { parsePOCsv, importPOLines } from "@/lib/actions/po-import";
import { editWithLog } from "@/lib/actions/edit-log";

type EditLogEntry = { id: number; entityType: string; entityId: number; field: string; oldValue: string | null; newValue: string | null; note: string | null; changedBy: string | null; role: string | null; createdAt: string };

type OrderLine = {
  id: number;
  product: string;
  colorId: number | null;
  size: string | null;
  style: string | null;
  quantity: number;
  unitPrice: number | null;
  notes: string | null;
  color: { id: number; name: string; hexValue: string | null } | null;
  _count: { productionRuns: number };
};

type OrderFull = {
  id: number;
  orderRef: string;
  status: string;
  supplierId: number | null;
  manufacturer: string | null;
  client: string | null;
  dueDate: Date | null;
  totalQuantity: number;
  priority: number;
  season: string | null;
  tags: string | null;
  notes: string | null;
  orderLines: OrderLine[];
};

type Material = { id: number; name: string; hexValue: string | null };

type SupplierOption = { id: number; name: string; type: string };

export function OrderDetailClient({ order, materials, suppliers, editHistory, userRole, userName, existingSeasons, existingTags }: { order: OrderFull; materials: Material[]; suppliers: SupplierOption[]; editHistory: EditLogEntry[]; userRole: string; userName: string; existingSeasons: string[]; existingTags: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [newColorId, setNewColorId] = useState<number | null>(null);
  const [newSize, setNewSize] = useState("");
  const [newQty, setNewQty] = useState(0);
  const [showPOUpload, setShowPOUpload] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);

  // Edit with note state
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editNote, setEditNote] = useState("");

  function handleEditLineQty(lineId: number, currentQty: number) {
    setEditingLineId(lineId);
    setEditQty(currentQty);
    setEditNote("");
  }

  function submitLineEdit() {
    if (!editingLineId) return;
    startTransition(async () => {
      await editWithLog({
        entityType: "order_line",
        entityId: editingLineId,
        field: "quantity",
        newValue: editQty,
        note: editNote || undefined,
      });
      setEditingLineId(null);
      setEditNote("");
      router.refresh();
    });
  }
  const [poResult, setPOResult] = useState<{ created: number; totalQty: number } | null>(null);

  const isAdmin = userRole === "ADMIN";
  const isDraft = order.status === "DRAFT";
  const isConfirmed = order.status === "CONFIRMED";
  const isInSupplierHands = ["ACKNOWLEDGED", "IN_PRODUCTION", "QC", "SHIPPED"].includes(order.status);
  const isBackWithAdmin = ["SHIPPED", "RECEIVED", "DELIVERED"].includes(order.status);
  const canEdit = isAdmin && isDraft; // Only admin can edit in draft

  async function handlePOUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = await parsePOCsv(text);
    if (lines.length === 0) {
      alert("No valid lines found. Format: product,size,style,quantity,unit_price");
      return;
    }
    startTransition(async () => {
      const result = await importPOLines(order.id, lines);
      if (result.success && result.data) {
        setPOResult(result.data);
      }
      router.refresh();
    });
  }

  function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateOrder(order.id, { status });
      router.refresh();
    });
  }

  function handleRevert(toStatus: string) {
    setRevertConfirm(null);
    startTransition(async () => {
      await updateOrder(order.id, { status: toStatus });
      router.refresh();
    });
  }

  function handleAddLine() {
    if (!newProduct.trim()) return;
    startTransition(async () => {
      await createOrderLine({
        orderId: order.id,
        product: newProduct.trim(),
        colorId: newColorId,
        size: newSize || null,
        quantity: newQty,
      });
      setNewProduct("");
      setNewColorId(null);
      setNewSize("");
      setNewQty(0);
      setShowAddLine(false);
      router.refresh();
    });
  }

  function handleDeleteLine(lineId: number) {
    startTransition(async () => {
      await deleteOrderLine(lineId);
      router.refresh();
    });
  }

  function handleDeleteOrder() {
    if (!confirm("Delete this order and all its lines?")) return;
    startTransition(async () => {
      await deleteOrder(order.id);
      router.push("/orders");
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      {/* Back nav */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/orders" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">{order.orderRef}</h1>
            <StatusBadge display={ORDER_STATUS_DISPLAY[order.status] || ORDER_STATUS_DISPLAY.DRAFT} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {order.client || "—"} {order.manufacturer ? `· Mfr: ${order.manufacturer}` : ""} · Due: {formatDate(order.dueDate)}
          </p>
        </div>
        {canEdit && (
          <button onClick={handleDeleteOrder} disabled={isPending} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Order status + action banner */}
      <div className="mb-6">
        {/* Status steps - visual only */}
        <div className="flex items-center gap-0 mb-4 overflow-x-auto scrollbar-none">
          {["DRAFT", "CONFIRMED", "ACKNOWLEDGED", "IN_PRODUCTION", "QC", "SHIPPED", "DELIVERED"].map((s, i) => {
            const display = ORDER_STATUS_DISPLAY[s];
            const statusOrder = ["DRAFT", "CONFIRMED", "ACKNOWLEDGED", "IN_PRODUCTION", "QC", "SHIPPED", "DELIVERED"];
            const currentIdx = statusOrder.indexOf(order.status);
            const isCurrent = order.status === s;
            const isPast = currentIdx > i;
            const isSupplierStep = ["ACKNOWLEDGED", "IN_PRODUCTION", "QC", "SHIPPED"].includes(s);
            return (
              <div key={s} className="flex items-center">
                {i > 0 && <div className={`w-3 sm:w-6 h-0.5 shrink-0 ${isPast ? "bg-badge-green-text" : "bg-border"}`} />}
                <div className={`flex flex-col items-center gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-lg shrink-0 ${
                  isCurrent ? "bg-foreground text-background scale-105" : isPast ? "bg-badge-green-bg text-badge-green-text" : "bg-muted/50 text-muted-foreground"
                }`}>
                  <span className="text-[7px] sm:text-[8px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {display?.label || s}
                  </span>
                  {isSupplierStep && !isCurrent && !isPast && (
                    <span className="text-[6px] uppercase tracking-wider opacity-50">Supplier</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contextual action banner */}
        {isAdmin && isDraft && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-badge-blue-bg/50 border border-badge-blue-text/20">
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground">This order is in draft</p>
              <p className="text-[10px] text-muted-foreground">Edit the order details, add lines, and assign a supplier. When ready, submit to the supplier.</p>
            </div>
            <button
              onClick={() => handleStatusChange("CONFIRMED")}
              disabled={isPending || !order.supplierId}
              className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 shrink-0"
            >
              {isPending ? "Submitting..." : "Submit to Supplier"}
            </button>
          </div>
        )}
        {isAdmin && isDraft && !order.supplierId && (
          <p className="text-[10px] text-badge-orange-text mt-2">⚠ Assign a supplier before submitting</p>
        )}

        {isAdmin && isConfirmed && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-badge-emerald-bg/50 border border-badge-emerald-text/20">
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground">Submitted to supplier — awaiting acknowledgment</p>
                <p className="text-[10px] text-muted-foreground">The supplier needs to accept this order before they can start production.</p>
              </div>
              <button
                onClick={() => setRevertConfirm("DRAFT")}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors shrink-0"
              >
                ← Recall
              </button>
            </div>
            {revertConfirm === "DRAFT" && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-badge-orange-bg/50 border border-badge-orange-text/30">
                <p className="text-[11px] text-foreground flex-1">Recall this order back to <span className="font-bold">Draft</span>? The supplier will no longer see it.</p>
                <button onClick={() => handleRevert("DRAFT")} disabled={isPending} className="px-3 py-1.5 rounded-lg bg-badge-orange-text text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
                  {isPending ? "..." : "Confirm"}
                </button>
                <button onClick={() => setRevertConfirm(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {!isAdmin && isConfirmed && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-badge-blue-bg/50 border border-badge-blue-text/20">
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground">New order received</p>
              <p className="text-[10px] text-muted-foreground">Please review the order details below and confirm you can fulfil this order.</p>
            </div>
            <button
              onClick={() => handleStatusChange("ACKNOWLEDGED")}
              disabled={isPending}
              className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 shrink-0"
            >
              {isPending ? "..." : "Accept Order"}
            </button>
          </div>
        )}

        {!isAdmin && isInSupplierHands && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/50 border border-border">
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-foreground">
                  {order.status === "SHIPPED" ? "Marked as shipped — awaiting admin confirmation" : "In your hands — update status as you progress"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* ── Backward buttons ── */}
                {order.status === "IN_PRODUCTION" && (
                  <button
                    onClick={() => setRevertConfirm("ACKNOWLEDGED")}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    ← Undo
                  </button>
                )}
                {order.status === "QC" && (
                  <button
                    onClick={() => setRevertConfirm("IN_PRODUCTION")}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    ← Production
                  </button>
                )}
                {order.status === "SHIPPED" && (
                  <button
                    onClick={() => setRevertConfirm("QC")}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                  >
                    ← Back to QC
                  </button>
                )}
                {/* ── Forward buttons ── */}
                {order.status === "ACKNOWLEDGED" && (
                  <button onClick={() => handleStatusChange("IN_PRODUCTION")} disabled={isPending} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: "hsl(25 95% 53%)" }}>
                    {isPending ? "..." : "Start Production"}
                  </button>
                )}
                {order.status === "IN_PRODUCTION" && (
                  <button onClick={() => handleStatusChange("QC")} disabled={isPending} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: "hsl(271 76% 53%)" }}>
                    {isPending ? "..." : "Move to QC"}
                  </button>
                )}
                {order.status === "QC" && (
                  <button onClick={() => handleStatusChange("SHIPPED")} disabled={isPending} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white" style={{ backgroundColor: "hsl(200 80% 50%)" }}>
                    {isPending ? "..." : "Mark Shipped"}
                  </button>
                )}
              </div>
            </div>
            {/* ── Inline revert confirmation ── */}
            {revertConfirm && revertConfirm !== "DRAFT" && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-badge-orange-bg/50 border border-badge-orange-text/30">
                <p className="text-[11px] text-foreground flex-1">
                  Move back to <span className="font-bold">{ORDER_STATUS_DISPLAY[revertConfirm]?.label || revertConfirm}</span>?
                  {revertConfirm === "IN_PRODUCTION" && " Use this if quality checks need a rework."}
                  {revertConfirm === "ACKNOWLEDGED" && " Use this if production hasn't actually started."}
                  {revertConfirm === "QC" && " Use this if the shipment was marked by mistake."}
                </p>
                <button
                  onClick={() => handleRevert(revertConfirm)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg bg-badge-orange-text text-white text-[10px] font-bold uppercase tracking-wider shrink-0"
                >
                  {isPending ? "..." : "Confirm"}
                </button>
                <button onClick={() => setRevertConfirm(null)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {isAdmin && order.status === "SHIPPED" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-badge-sky-bg/50 border border-badge-sky-text/20">
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-foreground">Shipped by supplier — confirm receipt</p>
              <p className="text-[10px] text-muted-foreground">Verify the goods have arrived and check quantities before confirming delivery.</p>
            </div>
            <button onClick={() => handleStatusChange("DELIVERED")} disabled={isPending} className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 shrink-0">
              Confirm Delivered
            </button>
          </div>
        )}

        {order.status === "DELIVERED" && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-badge-green-bg/50 border border-badge-green-text/20">
            <CheckCircle size={18} className="text-badge-green-text" />
            <p className="text-[12px] font-semibold text-foreground">Order complete — delivered and confirmed</p>
          </div>
        )}
      </div>

      {/* Supplier + Season (editable in draft, visible always) */}
      {isAdmin && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Supplier</label>
              {canEdit ? (
                <select
                  defaultValue={order.supplierId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    startTransition(async () => { await updateOrder(order.id, { supplierId: val }); router.refresh(); });
                  }}
                  disabled={isPending}
                  className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Select Supplier —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                </select>
              ) : (
                <div className="h-[38px] flex items-center">
                  <p className="text-[13px] font-semibold text-foreground">
                    {suppliers.find((s) => s.id === order.supplierId)?.name || "Unassigned"}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Season</label>
              {canEdit ? (
                <>
                  <input
                    defaultValue={order.season || ""}
                    list="season-suggestions"
                    onBlur={(e) => {
                      if (e.target.value !== (order.season || "")) {
                        startTransition(async () => { await updateOrder(order.id, { season: e.target.value || null }); router.refresh(); });
                      }
                    }}
                    className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. AW26, SS27"
                  />
                  <datalist id="season-suggestions">
                    {existingSeasons.map((s) => <option key={s} value={s} />)}
                  </datalist>
                </>
              ) : (
                <div className="h-[38px] flex items-center">
                  {order.season ? (
                    <Badge label={order.season} bgClass="bg-badge-purple-bg" textClass="text-badge-purple-text" />
                  ) : (
                    <p className="text-[13px] text-muted-foreground">—</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Tags</label>
              {canEdit ? (
                <>
                  <input
                    defaultValue={order.tags || ""}
                    list="tag-suggestions"
                    onBlur={(e) => {
                      if (e.target.value !== (order.tags || "")) {
                        startTransition(async () => { await updateOrder(order.id, { tags: e.target.value || null }); router.refresh(); });
                      }
                    }}
                    className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                    placeholder="e.g. priority, reorder"
                  />
                  <datalist id="tag-suggestions">
                    {existingTags.map((t) => <option key={t} value={t} />)}
                  </datalist>
                </>
              ) : (
                <div className="h-[38px] flex items-center gap-1 flex-wrap">
                  {order.tags?.split(",").filter(Boolean).map((t, i) => (
                    <Badge key={i} label={t.trim()} bgClass="bg-badge-gray-bg" textClass="text-badge-gray-text" />
                  ))}
                  {!order.season && !order.tags && <span className="text-[12px] text-muted-foreground">—</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Total Units</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{order.totalQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Order Lines</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{order.orderLines.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Priority</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">{order.priority}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Production Runs</p>
          <p className="text-[22px] font-bold tabular-nums text-foreground">
            {order.orderLines.reduce((sum, l) => sum + l._count.productionRuns, 0)}
          </p>
        </div>
      </div>

      {/* PO Upload */}
      {showPOUpload && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-3">Import Purchase Order</h3>
          <p className="text-[10px] text-muted-foreground mb-3">
            Upload a CSV file with columns: <span className="font-mono-brand">product, size, style, quantity, unit_price</span>
          </p>
          <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-foreground/30 cursor-pointer transition-colors">
            <FileSpreadsheet size={18} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Choose CSV file...</span>
            <input type="file" accept=".csv" onChange={handlePOUpload} className="hidden" disabled={isPending} />
          </label>
          {poResult && (
            <div className="mt-3 flex items-center gap-2 text-[11px] text-badge-green-text">
              ✓ Imported {poResult.created} lines ({poResult.totalQty} units)
            </div>
          )}
          <button onClick={() => { setShowPOUpload(false); setPOResult(null); }} className="mt-3 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Close
          </button>
        </div>
      )}

      {/* Order lines header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-foreground">Order Lines</h2>
        {canEdit && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPOUpload(!showPOUpload)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <Upload size={12} /> Import PO
          </button>
          <button
            onClick={() => setShowAddLine(!showAddLine)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={12} /> Add Line
          </button>
        </div>
        )}
      </div>

      {/* Add line form */}
      {showAddLine && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Product *</label>
              <input value={newProduct} onChange={(e) => setNewProduct(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. The Crewneck" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Colour</label>
              <select value={newColorId ?? ""} onChange={(e) => setNewColorId(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="">— None —</option>
                {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Size</label>
              <input value={newSize} onChange={(e) => setNewSize(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. M" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddLine} disabled={isPending || !newProduct.trim()} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50 transition-colors">Add</button>
            <button onClick={() => setShowAddLine(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Order lines */}
      <div className="space-y-2">
        {order.orderLines.map((line) => {
          const isExpanded = expandedLineId === line.id;
          return (
            <div key={line.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedLineId(isExpanded ? null : line.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-secondary/30 transition-colors"
              >
                {line.color?.hexValue && (
                  <div className="w-5 h-5 rounded border border-border shrink-0" style={{ backgroundColor: line.color.hexValue }} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">{line.product}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {line.color?.name || "—"} · {line.size || "—"} · {line.style || "—"}
                  </p>
                </div>
                <span className="text-[13px] font-bold font-mono-brand tabular-nums text-foreground">{line.quantity}</span>
                <Badge label={`${line._count.productionRuns} run${line._count.productionRuns !== 1 ? "s" : ""}`} />
                {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-5 py-3 bg-secondary/20 space-y-3">
                  {/* Line details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px]">
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">SKU</p>
                      <p className="font-mono-brand font-bold text-foreground">{line.style || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Colour</p>
                      <p className="text-foreground">{line.color?.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Size</p>
                      <p className="text-foreground">{line.size || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Unit Price</p>
                      <p className="font-mono-brand text-foreground">{line.unitPrice != null ? `€${line.unitPrice.toFixed(2)}` : "—"}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      {line._count.productionRuns > 0 && (
                        <Link href={`/production-runs?orderLineId=${line.id}`} className="text-primary hover:underline">
                          {line._count.productionRuns} run{line._count.productionRuns !== 1 ? "s" : ""} →
                        </Link>
                      )}
                      {/* Start Production — pre-fills a run from this line */}
                      {isInSupplierHands && (
                        <Link
                          href={`/production-runs?create=true&orderLineId=${line.id}&product=${encodeURIComponent(line.product)}&sku=${encodeURIComponent(line.style || "")}&size=${encodeURIComponent(line.size || "")}&qty=${line.quantity}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{ backgroundColor: "hsl(25 95% 53%)" }}
                        >
                          Start Production Run
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEditLineQty(line.id, line.quantity)} className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors">
                        <Pencil size={10} /> Edit Qty
                      </button>
                      {canEdit && (
                        <button onClick={() => handleDeleteLine(line.id)} disabled={isPending} className="flex items-center gap-1 text-[10px] text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50">
                          <Trash2 size={11} /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline edit with note */}
                  {editingLineId === line.id && (
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">Edit Quantity</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">New Quantity</label>
                          <input type="number" value={editQty} onChange={(e) => setEditQty(parseInt(e.target.value) || 0)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
                        </div>
                        <div className="flex-[2]">
                          <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Reason for change *</label>
                          <input value={editNote} onChange={(e) => setEditNote(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. 5 extra to cover QC rejects" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={submitLineEdit} disabled={isPending || !editNote.trim()} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold uppercase tracking-wider disabled:opacity-40">Save</button>
                        <button onClick={() => setEditingLineId(null)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                      </div>
                      <p className="text-[9px] text-muted-foreground">Change: {line.quantity} → {editQty} ({editQty - line.quantity > 0 ? "+" : ""}{editQty - line.quantity})</p>
                    </div>
                  )}

                  {/* Line edit history */}
                  {editHistory.filter((e) => e.entityType === "order_line" && e.entityId === line.id).length > 0 && (
                    <div className="border-t border-border pt-2">
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Changes</p>
                      {editHistory.filter((e) => e.entityType === "order_line" && e.entityId === line.id).map((entry) => (
                        <div key={entry.id} className="flex items-start gap-2 py-1 text-[9px]">
                          <Badge label={entry.role || "?"} bgClass={entry.role === "SUPPLIER" ? "bg-badge-blue-bg" : "bg-badge-gray-bg"} textClass={entry.role === "SUPPLIER" ? "text-badge-blue-text" : "text-badge-gray-text"} />
                          <span className="text-muted-foreground">
                            {entry.changedBy} changed {entry.field}: <span className="font-mono-brand">{entry.oldValue}</span> → <span className="font-mono-brand font-bold">{entry.newValue}</span>
                          </span>
                          {entry.note && <span className="text-foreground italic">&ldquo;{entry.note}&rdquo;</span>}
                          <span className="text-muted-foreground/50 ml-auto shrink-0">{formatDate(entry.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {order.orderLines.length === 0 && (
          <div className="text-center py-10 border border-dashed border-border rounded-xl">
            <p className="text-[11px] text-muted-foreground">No order lines yet. Add one above.</p>
          </div>
        )}
      </div>

      {/* ─── Change History ─── */}
      {editHistory.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground mb-3">
            <History size={14} />
            Change History ({editHistory.length})
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showHistory && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border max-h-[40vh] overflow-y-auto">
                {editHistory.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-3">
                    <Badge
                      label={entry.role || "?"}
                      bgClass={entry.role === "SUPPLIER" ? "bg-badge-blue-bg" : "bg-badge-gray-bg"}
                      textClass={entry.role === "SUPPLIER" ? "text-badge-blue-text" : "text-badge-gray-text"}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground">
                        <span className="font-semibold">{entry.changedBy}</span> changed <span className="font-mono-brand">{entry.entityType}.{entry.field}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono-brand">
                        {entry.oldValue || "—"} → <span className="font-bold text-foreground">{entry.newValue}</span>
                      </p>
                      {entry.note && (
                        <p className="text-[10px] text-foreground mt-0.5 italic bg-badge-orange-bg/30 px-2 py-1 rounded">
                          &ldquo;{entry.note}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground shrink-0">{formatDate(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {!isAdmin && (
        <ContextualHelp
          pageId="order-detail"
          title="Order Details"
          steps={[
            { icon: "👀", text: "Review the order — check products, sizes and quantities" },
            { icon: "✅", text: "If everything looks correct, tap 'Accept Order' at the top" },
            { icon: "🏭", text: "Once accepted, go to Production to start making the items" },
            { icon: "📦", text: "Update the order status as you progress through production" },
          ]}
          tip="If a quantity is wrong, tap the pencil icon to request a change with a note."
        />
      )}
    </div>
  );
}
