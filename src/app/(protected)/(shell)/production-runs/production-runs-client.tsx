"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, ChevronDown, ChevronUp, Factory, Building2, List, Columns3, GripVertical, ChevronRight } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { RUN_STATUS_DISPLAY, RUN_STATUS_ORDER, getRunStatusOrder, formatDate } from "@/types/supply-chain";
import { createProductionRun, updateProductionRun } from "@/lib/actions/production-runs";
import { useToast } from "@/components/ui/toast";
import { ContextualHelp } from "@/components/ui/contextual-help";

type RunWithRelations = {
  id: number;
  runCode: string;
  status: string;
  supplierId: number | null;
  quantity: number;
  unitsProduced: number;
  washingProgram: string | null;
  washingTemperature: number | null;
  stitchType: string | null;
  machineGauge: string | null;
  knitwearPly: string | null;
  productName: string | null;
  productSize: string | null;
  productColor: string | null;
  sku: string | null;
  startDate: string | null;
  expectedExFactory: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: number; name: string } | null;
  orderLine: {
    id: number;
    product: string;
    size: string | null;
    order: { orderRef: string };
    color: { name: string; hexValue: string | null } | null;
  } | null;
  order: { orderRef: string } | null;
  sizeBreakdown: { id: number; size: string; sku: string | null; quantity: number; produced: number }[];
  yarnCompositions: { id: number; yarnType: string; percentage: number }[];
  _count: { garments: number };
};

type SupplierOption = { id: number; name: string; type: string };
type YarnLotOption = { lineId: number; colourCode: string; colourName: string; lotNumber: string; remainingKg: number; deliveryRef: string; yarnType: string };

type OrderLineDetail = { id: number; product: string; style: string | null; size: string | null; quantity: number; unitPrice: number | null; _count: { productionRuns: number } };
type AcknowledgedOrder = { id: number; orderRef: string; status: string; totalQuantity: number; dueDate: string | null; orderLines: OrderLineDetail[]; _count: { orderLines: number } };

export function ProductionRunsClient({
  initialRuns,
  suppliers,
  yarnLots,
  acknowledgedOrders,
  pendingAcceptanceCount,
  filterOrderLineId,
  shippedAwaitingReceipt = 0,
  isAdmin,
  userSupplierId,
  showCreateOnLoad,
  prefill,
}: {
  initialRuns: RunWithRelations[];
  suppliers: SupplierOption[];
  yarnLots: YarnLotOption[];
  acknowledgedOrders?: AcknowledgedOrder[];
  pendingAcceptanceCount?: number;
  filterOrderLineId?: number;
  shippedAwaitingReceipt?: number;
  isAdmin: boolean;
  userSupplierId: number | null;
  showCreateOnLoad?: boolean;
  prefill?: { product: string; sku: string; size: string; qty: number; orderLineId: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  // Admin pipeline: PLANNED → IN_PRODUCTION → QC → SHIPPING → RECEIVED (terminal)
  const statusOrder: readonly string[] = isAdmin
    ? (["PLANNED", "IN_PRODUCTION", "QC", "SHIPPED", "RECEIVED"] as const)
    : getRunStatusOrder("SUPPLIER");
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(statusOrder));
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const isRecentlyCompleted = (run: RunWithRelations) =>
    Date.now() - new Date(run.updatedAt ?? run.createdAt).getTime() < SEVEN_DAYS_MS;
  const [viewMode, setViewMode] = useState<"list" | "pipeline">(isAdmin ? "pipeline" : "list");
  const [showCreate, setShowCreate] = useState(false);
  const [batchLines, setBatchLines] = useState<OrderLineDetail[]>([]); // Lines to batch-create runs for
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [dragRunId, setDragRunId] = useState<number | null>(null);
  const [receiptRunId, setReceiptRunId] = useState<number | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Inline form state — which order card has the form open inside it
  const [inlineFormOrderId, setInlineFormOrderId] = useState<number | null>(null);
  const [inlineFormStep, setInlineFormStep] = useState<"sizes" | "details">("sizes");
  const [inlineSelectedLines, setInlineSelectedLines] = useState<OrderLineDetail[]>([]);
  // For standalone form: selected PO from dropdown
  const [standaloneOrderId, setStandaloneOrderId] = useState<number | null>(null);

  // Create form
  // Pre-fill from PO link if available
  const pf = prefill;
  const [newCode, setNewCode] = useState("AUTO");
  const [newQty, setNewQty] = useState(pf?.qty || 0);
  const [newSupplierId, setNewSupplierId] = useState<number | null>(userSupplierId);
  const [newSku, setNewSku] = useState(pf?.sku || "");
  const [newProductName, setNewProductName] = useState(pf?.product || "");
  const [newProductColor, setNewProductColor] = useState("");
  const [newYarnLotId, setNewYarnLotId] = useState<number | null>(null);
  const [newYarnColourCode, setNewYarnColourCode] = useState("");
  const [newYarnLotNumber, setNewYarnLotNumber] = useState("");
  const [newIndividualTagging, setNewIndividualTagging] = useState(true);
  const [newWashing, setNewWashing] = useState("");
  const [newTemp, setNewTemp] = useState("");
  const [newStitchType, setNewStitchType] = useState("");
  const [newFinisherName, setNewFinisherName] = useState("");
  const [newGauge, setNewGauge] = useState("");
  const [newPly, setNewPly] = useState("");

  // When yarn lot is selected, auto-populate colour
  function handleYarnLotSelect(lotLineId: string) {
    const id = parseInt(lotLineId);
    setNewYarnLotId(id || null);
    const lot = yarnLots.find((l) => l.lineId === id);
    if (lot) {
      setNewYarnColourCode(lot.colourCode);
      setNewYarnLotNumber(lot.lotNumber);
      setNewProductColor(lot.colourName);
    } else {
      setNewYarnColourCode("");
      setNewYarnLotNumber("");
    }
  }

  // Group yarn lots by colour for easier selection
  const yarnLotsByColour = new Map<string, YarnLotOption[]>();
  for (const lot of yarnLots) {
    const existing = yarnLotsByColour.get(lot.colourCode) || [];
    existing.push(lot);
    yarnLotsByColour.set(lot.colourCode, existing);
  }

  // Open create form on load if ?create=true
  useEffect(() => {
    if (showCreateOnLoad) setShowCreate(true);
  }, [showCreateOnLoad]);

  // Reset inline form state
  function resetFormFields() {
    setNewCode("AUTO"); setNewQty(0); setNewSku(""); setNewProductName(""); setNewProductColor("");
    setNewYarnLotId(null); setNewYarnColourCode(""); setNewYarnLotNumber("");
    setNewIndividualTagging(true); setNewWashing(""); setNewTemp("");
    setNewStitchType(""); setNewFinisherName(""); setNewGauge(""); setNewPly("");
  }

  // Open inline form inside a PO card
  function openInlineForm(orderId: number, lines: OrderLineDetail[], mode: "all" | "single", singleLine?: OrderLineDetail) {
    // Close any existing inline form / standalone form
    setShowCreate(false);
    setBatchLines([]);
    resetFormFields();

    setExpandedOrderId(orderId);
    setInlineFormOrderId(orderId);
    setInlineFormStep(mode === "all" ? "details" : "details");

    if (mode === "all") {
      setInlineSelectedLines(lines);
      setNewProductName(lines[0]?.product || "");
    } else if (singleLine) {
      setInlineSelectedLines([singleLine]);
      setNewProductName(singleLine.product);
      setNewSku(singleLine.style || "");
      setNewQty(singleLine.quantity);
    }
  }

  // Close inline form
  function closeInlineForm() {
    setInlineFormOrderId(null);
    setInlineFormStep("sizes");
    setInlineSelectedLines([]);
    resetFormFields();
  }

  // Handle creating from inline form
  async function handleInlineCreate() {
    startTransition(async () => {
      const config = getSharedConfig();
      let result;

      if (inlineSelectedLines.length > 1) {
        // Batch mode — one run with size breakdown
        const sizes = inlineSelectedLines.map((line) => ({
          size: line.size || "One Size",
          sku: line.style || undefined,
          quantity: line.quantity,
          orderLineId: line.id,
        }));
        result = await createProductionRun(
          {
            runCode: "AUTO",
            orderId: null,
            orderLineId: inlineSelectedLines[0]?.id || null,
            productName: inlineSelectedLines[0]?.product || newProductName || null,
            productColor: newProductColor || null,
            ...config,
          },
          undefined,
          sizes,
        );
      } else if (inlineSelectedLines.length === 1) {
        const line = inlineSelectedLines[0];
        result = await createProductionRun({
          runCode: newCode.trim() || "AUTO",
          quantity: line.quantity,
          orderLineId: line.id,
          sku: line.style || newSku || null,
          productName: line.product || newProductName || null,
          productColor: newProductColor || null,
          productSize: line.size || null,
          ...config,
        });
      }

      closeInlineForm();
      toast("Production run created", "success");
      if (result?.success && result.data) {
        router.push(`/production-runs/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  // Handle standalone PO selection
  function handleStandaloneOrderSelect(orderId: string) {
    const id = parseInt(orderId);
    setStandaloneOrderId(id || null);
    if (id && acknowledgedOrders) {
      const order = acknowledgedOrders.find((o) => o.id === id);
      if (order) {
        const linesWithoutRuns = order.orderLines.filter((l) => l._count.productionRuns === 0);
        if (linesWithoutRuns.length > 0) {
          setBatchLines(linesWithoutRuns);
          setNewProductName(linesWithoutRuns[0]?.product || "");
        }
      }
    } else {
      setBatchLines([]);
      setStandaloneOrderId(null);
    }
  }

  function toggleColumn(status: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        // Don't allow hiding all columns
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }

  function toggleAll() {
    if (visibleColumns.size === statusOrder.length) {
      // Show only active statuses
      setVisibleColumns(new Set(["PLANNED", "IN_PRODUCTION", "QC"]));
    } else {
      setVisibleColumns(new Set(statusOrder));
    }
  }

  const filtered = initialRuns.filter((r) => {
    const matchSearch =
      r.runCode.toLowerCase().includes(search.toLowerCase()) ||
      (r.orderLine?.order.orderRef.toLowerCase().includes(search.toLowerCase())) ||
      (r.orderLine?.product.toLowerCase().includes(search.toLowerCase())) ||
      (r.supplier?.name.toLowerCase().includes(search.toLowerCase()));
    const matchColumn = visibleColumns.has(r.status);
    return matchSearch && matchColumn;
  });

  // Shared config for creating runs
  function getSharedConfig() {
    return {
      supplierId: newSupplierId,
      yarnColourCode: newYarnColourCode || null,
      yarnLotNumber: newYarnLotNumber || null,
      individualTagging: newIndividualTagging,
      washingProgram: newWashing || null,
      washingTemperature: newTemp ? parseFloat(newTemp) : null,
      stitchType: newStitchType || null,
      finisherName: newFinisherName || null,
      machineGauge: newGauge || null,
      knitwearPly: newPly || null,
    };
  }

  async function handleCreate() {
    startTransition(async () => {
      const config = getSharedConfig();
      let result;

      if (batchLines.length > 0) {
        // Batch mode — create ONE run with size breakdown
        const sizes = batchLines.map((line) => ({
          size: line.size || "One Size",
          sku: line.style || undefined,
          quantity: line.quantity,
          orderLineId: line.id,
        }));
        // Get order ID from first line's order
        const firstOrderLineId = batchLines[0]?.id;
        result = await createProductionRun(
          {
            runCode: "AUTO",
            orderId: null, // Will be set from order context
            orderLineId: firstOrderLineId || null,
            productName: batchLines[0]?.product || newProductName || null,
            productColor: newProductColor || null,
            ...config,
          },
          undefined, // no yarn composition
          sizes,
        );
      } else {
        // Single run
        result = await createProductionRun({
          runCode: newCode.trim() || "AUTO",
          quantity: newQty,
          orderLineId: filterOrderLineId || (pf?.orderLineId) || null,
          sku: newSku || null,
          productName: newProductName || null,
          productColor: newProductColor || null,
          productSize: pf?.size || null,
          ...config,
        });
      }

      // Reset
      resetFormFields();
      setBatchLines([]);
      setShowCreate(false);
      setStandaloneOrderId(null);
      toast("Production run created", "success");
      if (result?.success && result.data) {
        router.push(`/production-runs/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function handleDrop(runId: number, newStatus: string) {
    startTransition(async () => {
      await updateProductionRun(runId, { status: newStatus });
      setDragRunId(null);
      router.refresh();
    });
  }

  async function handleAssignSupplier(runId: number, supplierId: number | null) {
    startTransition(async () => {
      await updateProductionRun(runId, { supplierId });
      router.refresh();
    });
  }

  // ── Reusable manufacturing details form (used both inline and standalone) ──
  function ManufacturingForm({ onSubmit, onCancel, submitLabel, lines }: { onSubmit: () => void; onCancel: () => void; submitLabel: string; lines: OrderLineDetail[] }) {
    return (
      <div className="space-y-4">
        {/* Show sizes being created */}
        {lines.length > 0 && (
          <div className="bg-badge-emerald-bg/20 rounded-lg p-3">
            <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Sizes in this run:</p>
            <div className="flex flex-wrap gap-1.5">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-md text-[9px]">
                  {line.style && <span className="font-mono-brand font-bold text-primary">{line.style}</span>}
                  <span className="text-foreground font-medium">{line.size || "One Size"}</span>
                  <span className="font-mono-brand text-muted-foreground">×{line.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yarn Selection */}
        <div className="bg-secondary/30 rounded-lg p-3">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Yarn Selection</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Yarn Lot</label>
              <select value={newYarnLotId ?? ""} onChange={(e) => handleYarnLotSelect(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                <option value="">Select yarn lot...</option>
                {Array.from(yarnLotsByColour.entries()).map(([code, lots]) => (
                  <optgroup key={code} label={`${code} — ${lots[0].colourName}`}>
                    {lots.map((l) => (
                      <option key={l.lineId} value={l.lineId}>Lot {l.lotNumber} — {l.remainingKg.toFixed(2)} kg</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Colour Code</label>
              <input value={newYarnColourCode} onChange={(e) => setNewYarnColourCode(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Auto from lot" readOnly={!!newYarnLotId} />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Lot Number</label>
              <input value={newYarnLotNumber} onChange={(e) => setNewYarnLotNumber(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Auto from lot" readOnly={!!newYarnLotId} />
            </div>
          </div>
          {yarnLots.length === 0 && <p className="text-[9px] text-badge-orange-text mt-2">No yarn stock available. Upload a delivery note in Materials first.</p>}
        </div>

        {/* Manufacturing Config */}
        <div>
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Manufacturing Config</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Washing</label>
              <input value={newWashing} onChange={(e) => setNewWashing(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Program A" />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Temp (°C)</label>
              <input value={newTemp} onChange={(e) => setNewTemp(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" placeholder="30" />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Stitch Type</label>
              <input value={newStitchType} onChange={(e) => setNewStitchType(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Plain knit" />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Finisher</label>
              <input value={newFinisherName} onChange={(e) => setNewFinisherName(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Manteco" />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Gauge</label>
              <input value={newGauge} onChange={(e) => setNewGauge(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="12GG" />
            </div>
            <div>
              <label className="block text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Ply</label>
              <input value={newPly} onChange={(e) => setNewPly(e.target.value)} className="w-full h-[34px] px-2.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="4-ply" />
            </div>
          </div>
        </div>

        {/* Tagging mode — two options */}
        <div>
          <p className="text-[8px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Tagging Mode</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNewIndividualTagging(true)}
              className={`h-[34px] px-3 rounded-lg text-[11px] font-medium border transition-all ${newIndividualTagging ? "bg-badge-purple-bg border-badge-purple-text/30 text-badge-purple-text" : "bg-background border-border text-muted-foreground"}`}
            >
              {newIndividualTagging && "✓ "}Individual Tagging
            </button>
            <button
              type="button"
              onClick={() => setNewIndividualTagging(false)}
              className={`h-[34px] px-3 rounded-lg text-[11px] font-medium border transition-all ${!newIndividualTagging ? "bg-badge-blue-bg border-badge-blue-text/30 text-badge-blue-text" : "bg-background border-border text-muted-foreground"}`}
            >
              {!newIndividualTagging && "✓ "}Bulk Mode
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-2 pt-1">
          <button onClick={onSubmit} disabled={isPending} className="px-4 py-2 rounded-lg bg-foreground text-background text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors">
            {isPending ? "Creating..." : submitLabel}
          </button>
          <button onClick={onCancel} className="px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Production</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">
            {isAdmin ? (filterOrderLineId ? "Runs for Order Line" : "All Runs") : "My Runs"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-card border border-border rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List size={12} /> List
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === "pipeline" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Columns3 size={12} /> Pipeline
            </button>
          </div>
          <button
            onClick={() => { closeInlineForm(); setShowCreate(!showCreate); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white transition-colors"
            style={{ backgroundColor: "hsl(25 95% 53%)" }}
          >
            <Plus size={14} /> New Run
          </button>
        </div>
      </div>

      {/* ── Admin: runs awaiting receipt confirmation ── */}
      {isAdmin && shippedAwaitingReceipt > 0 && (
        <div className="mb-5 flex items-center gap-3 p-4 rounded-xl bg-badge-sky-bg/50 border border-badge-sky-text/20">
          <div className="w-8 h-8 rounded-full bg-badge-sky-text/10 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-bold text-badge-sky-text">{shippedAwaitingReceipt}</span>
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-foreground">
              {shippedAwaitingReceipt} shipment{shippedAwaitingReceipt !== 1 ? "s" : ""} awaiting your receipt confirmation
            </p>
            <p className="text-[10px] text-muted-foreground">Open each run and click "Confirm Goods Received" to mark as received.</p>
          </div>
          <button
            onClick={() => { setVisibleColumns(new Set(["SHIPPED"])); setViewMode("pipeline"); }}
            className="px-4 py-2 rounded-lg bg-badge-sky-text text-white text-[11px] font-bold uppercase tracking-wider shrink-0 hover:opacity-90 transition-opacity"
          >
            View Shipped →
          </button>
        </div>
      )}

      {/* ── Standalone Create form (from top button / homepage) ── */}
      {showCreate && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">
              {batchLines.length > 0 ? `New Run — ${batchLines.length} Sizes` : "New Production Run"}
            </h3>
            <button onClick={() => { setShowCreate(false); setBatchLines([]); setStandaloneOrderId(null); resetFormFields(); }} className="text-[10px] text-muted-foreground hover:text-foreground">✕ Close</button>
          </div>

          {/* ── PO Dropdown — link to an existing order ── */}
          {acknowledgedOrders && acknowledgedOrders.length > 0 && (
            <div className="bg-badge-blue-bg/20 rounded-lg p-3">
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Link to Purchase Order</label>
              <select
                value={standaloneOrderId ?? ""}
                onChange={(e) => handleStandaloneOrderSelect(e.target.value)}
                className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">No PO — standalone run</option>
                {acknowledgedOrders.filter((o) => o.orderLines.some((l) => l._count.productionRuns === 0)).map((order) => {
                  const pendingLines = order.orderLines.filter((l) => l._count.productionRuns === 0);
                  return (
                    <option key={order.id} value={order.id}>
                      {order.orderRef} — {pendingLines.length} size{pendingLines.length !== 1 ? "s" : ""}, {pendingLines.reduce((s, l) => s + l.quantity, 0)} units
                    </option>
                  );
                })}
              </select>
              {standaloneOrderId && batchLines.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {batchLines.map((line) => (
                    <div key={line.id} className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-md text-[9px]">
                      {line.style && <span className="font-mono-brand font-bold text-primary">{line.style}</span>}
                      <span className="text-foreground font-medium">{line.size || "One Size"}</span>
                      <span className="font-mono-brand text-muted-foreground">×{line.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Batch mode — show sizes being created (only for non-PO-dropdown batch) */}
          {batchLines.length > 0 && !standaloneOrderId && (
            <div className="bg-badge-emerald-bg/30 rounded-lg p-3">
              <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Creating runs for:</p>
              <div className="flex flex-wrap gap-2">
                {batchLines.map((line) => (
                  <div key={line.id} className="flex items-center gap-2 px-2.5 py-1 bg-card border border-border rounded-lg text-[10px]">
                    <span className="font-mono-brand font-bold text-primary">{line.style || "—"}</span>
                    <span className="text-foreground">{line.size || "—"}</span>
                    <span className="font-mono-brand text-muted-foreground">×{line.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single mode — show pre-fill info */}
          {batchLines.length === 0 && !standaloneOrderId && pf?.product && (
            <div className="flex items-center gap-2 p-3 bg-badge-blue-bg/30 rounded-lg">
              <Badge label={`Order line #${pf.orderLineId}`} bgClass="bg-badge-blue-bg" textClass="text-badge-blue-text" />
              <span className="text-[11px] text-foreground">
                {pf.product} {pf.size && `· Size ${pf.size}`} {pf.qty > 0 && `· ${pf.qty} units`}
              </span>
            </div>
          )}
          {/* ── Section 1: Yarn Selection ── */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-3">Yarn Selection</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Yarn Lot</label>
                <select value={newYarnLotId ?? ""} onChange={(e) => handleYarnLotSelect(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Select yarn lot...</option>
                  {Array.from(yarnLotsByColour.entries()).map(([code, lots]) => (
                    <optgroup key={code} label={`${code} — ${lots[0].colourName}`}>
                      {lots.map((l) => (
                        <option key={l.lineId} value={l.lineId}>Lot {l.lotNumber} — {l.remainingKg.toFixed(2)} kg ({l.deliveryRef})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Colour Code</label>
                <input value={newYarnColourCode} onChange={(e) => setNewYarnColourCode(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Auto from lot" readOnly={!!newYarnLotId} />
              </div>
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Lot Number</label>
                <input value={newYarnLotNumber} onChange={(e) => setNewYarnLotNumber(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Auto from lot" readOnly={!!newYarnLotId} />
              </div>
            </div>
            {yarnLots.length === 0 && <p className="text-[10px] text-badge-orange-text mt-2">No yarn stock available. Upload a delivery note in Materials first.</p>}
          </div>

          {/* ── Section 2: Product + Run Details (hidden in batch mode) ── */}
          {batchLines.length === 0 && (
          <><p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Product &amp; Run Details</p></>
          )}
          {batchLines.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Run Code</label>
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="AUTO" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">SKU</label>
              <input value={newSku} onChange={(e) => setNewSku(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="CREW-V2-NAV-M" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Product</label>
              <input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Product name" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Colour</label>
              <input value={newProductColor} onChange={(e) => setNewProductColor(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Auto from yarn" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
            </div>
            {isAdmin && (
              <div>
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Supplier</label>
                <select value={newSupplierId ?? ""} onChange={(e) => setNewSupplierId(e.target.value ? parseInt(e.target.value) : null)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring">
                  <option value="">— Unassigned —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Tagging</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setNewIndividualTagging(true)}
                  className={`flex-1 h-[38px] px-2 rounded-lg text-[11px] font-medium border transition-all ${newIndividualTagging ? "bg-badge-purple-bg border-badge-purple-text/30 text-badge-purple-text" : "bg-background border-border text-muted-foreground"}`}
                >
                  {newIndividualTagging && "✓ "}Individual
                </button>
                <button
                  type="button"
                  onClick={() => setNewIndividualTagging(false)}
                  className={`flex-1 h-[38px] px-2 rounded-lg text-[11px] font-medium border transition-all ${!newIndividualTagging ? "bg-badge-blue-bg border-badge-blue-text/30 text-badge-blue-text" : "bg-background border-border text-muted-foreground"}`}
                >
                  {!newIndividualTagging && "✓ "}Bulk
                </button>
              </div>
            </div>
          </div>
          )}

          {/* ── Section 3: Manufacturing Config ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Washing</label>
              <input value={newWashing} onChange={(e) => setNewWashing(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Program A" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Temp (°C)</label>
              <input value={newTemp} onChange={(e) => setNewTemp(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" placeholder="30" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Stitch Type</label>
              <input value={newStitchType} onChange={(e) => setNewStitchType(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Plain knit" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Finisher</label>
              <input value={newFinisherName} onChange={(e) => setNewFinisherName(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Manteco" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Gauge</label>
              <input value={newGauge} onChange={(e) => setNewGauge(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="12GG" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Ply</label>
              <input value={newPly} onChange={(e) => setNewPly(e.target.value)} className="w-full h-[38px] px-3 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="4-ply" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <button onClick={handleCreate} disabled={isPending} className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 transition-colors">
              {isPending ? "Creating..." : batchLines.length > 0 ? `Create Run (${batchLines.length} sizes)` : "Create Production Run"}
            </button>
            <button onClick={() => { setShowCreate(false); setBatchLines([]); setStandaloneOrderId(null); resetFormFields(); }} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search runs, orders, suppliers..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-[12px] text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center flex-wrap gap-1 bg-card border border-border rounded-lg p-1">
          <button
            onClick={toggleAll}
            className={`px-2 py-1 rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${visibleColumns.size === statusOrder.length ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {statusOrder.map((s) => {
            const isOn = visibleColumns.has(s);
            return (
              <button
                key={s}
                onClick={() => toggleColumn(s)}
                className={`px-2 py-1 rounded-md text-[8px] sm:text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${isOn ? "bg-secondary text-foreground" : "text-muted-foreground/40 line-through hover:text-muted-foreground hover:no-underline"}`}
              >
                {RUN_STATUS_DISPLAY[s]?.label || s}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-4">{filtered.length} run{filtered.length !== 1 ? "s" : ""}</p>

      {/* ── Pending acceptance nudge — supplier has CONFIRMED orders they haven't accepted yet ── */}
      {!isAdmin && pendingAcceptanceCount != null && pendingAcceptanceCount > 0 && (
        <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-badge-blue-bg/50 border border-badge-blue-text/20">
          <div className="flex-1">
            <p className="text-[12px] font-semibold text-foreground">
              {pendingAcceptanceCount} new order{pendingAcceptanceCount !== 1 ? "s" : ""} waiting for your acceptance
            </p>
            <p className="text-[10px] text-muted-foreground">Go to Orders to review and accept before starting production.</p>
          </div>
          <Link
            href="/orders"
            className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider shrink-0"
          >
            View Orders →
          </Link>
        </div>
      )}

      {/* ── Acknowledged Orders — ready to start (hide orders where all lines have runs) ── */}
      {acknowledgedOrders && acknowledgedOrders.filter((o) => o.orderLines.some((l) => l._count.productionRuns === 0)).length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-badge-emerald-text text-white flex items-center justify-center text-[10px] font-bold">{acknowledgedOrders.filter((o) => o.orderLines.some((l) => l._count.productionRuns === 0)).length}</span>
            Orders Ready to Start
          </h2>
          <div className="space-y-2">
            {acknowledgedOrders.filter((o) => o.orderLines.some((l) => l._count.productionRuns === 0)).map((order) => {
              const isOrderExpanded = expandedOrderId === order.id;
              const linesWithoutRuns = order.orderLines.filter((l) => l._count.productionRuns === 0);
              const isInlineFormOpen = inlineFormOrderId === order.id;
              return (
                <div key={order.id} className={`bg-card border-2 rounded-xl overflow-hidden transition-all ${isInlineFormOpen ? "border-primary/40 ring-1 ring-primary/20" : "border-badge-emerald-text/20"}`}>
                  {/* Order header — always shows PO ref */}
                  <div
                    onClick={() => {
                      if (isInlineFormOpen) {
                        closeInlineForm();
                        setExpandedOrderId(null);
                      } else {
                        setExpandedOrderId(isOrderExpanded ? null : order.id);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-5 py-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-bold text-foreground">{order.orderRef}</p>
                        <Badge
                          label={order.status === "CONFIRMED" ? "New" : "Ready"}
                          bgClass={order.status === "CONFIRMED" ? "bg-badge-blue-bg" : "bg-badge-emerald-bg"}
                          textClass={order.status === "CONFIRMED" ? "text-badge-blue-text" : "text-badge-emerald-text"}
                        />
                        {isInlineFormOpen && (
                          <Badge label="Setting up run" bgClass="bg-primary/10" textClass="text-primary" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {order.orderLines.length} line{order.orderLines.length !== 1 ? "s" : ""} · {order.totalQuantity} units
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isInlineFormOpen && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInlineForm(order.id, linesWithoutRuns, "all");
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider text-white shrink-0"
                          style={{ backgroundColor: "hsl(25 95% 53%)" }}
                        >
                          ▶ Start All
                        </button>
                      )}
                      {isOrderExpanded || isInlineFormOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Expanded — show lines + inline form */}
                  {(isOrderExpanded || isInlineFormOpen) && (
                    <div className="border-t border-badge-emerald-text/10">

                      {/* ── Step 1: Size selection (before inline form is opened) ── */}
                      {!isInlineFormOpen && (
                        <>
                          {/* Start All button */}
                          <div className="px-5 py-3 bg-badge-emerald-bg/30 flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">{linesWithoutRuns.length} size{linesWithoutRuns.length !== 1 ? "s" : ""} · {linesWithoutRuns.reduce((s, l) => s + l.quantity, 0)} total units</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openInlineForm(order.id, linesWithoutRuns, "all");
                              }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white"
                              style={{ backgroundColor: "hsl(25 95% 53%)" }}
                            >
                              Start All {linesWithoutRuns.length} Sizes
                            </button>
                          </div>

                          {/* Individual lines */}
                          {order.orderLines.map((line) => (
                            <div key={line.id} className="px-5 py-3 border-b border-border last:border-0 hover:bg-secondary/10">
                              <div className="flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-semibold text-foreground">{line.product}</p>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                    {line.style && <span className="font-mono-brand font-bold text-primary">{line.style}</span>}
                                    {line.size && <span>Size: <span className="text-foreground font-medium">{line.size}</span></span>}
                                    <span>Qty: <span className="font-mono-brand font-bold text-foreground">{line.quantity}</span></span>
                                    {line.unitPrice != null && <span>€{line.unitPrice.toFixed(2)}/unit</span>}
                                    {line._count.productionRuns > 0 && (
                                      <Badge label={`${line._count.productionRuns} run${line._count.productionRuns !== 1 ? "s" : ""}`} bgClass="bg-badge-gray-bg" textClass="text-badge-gray-text" />
                                    )}
                                  </div>
                                </div>
                                {line._count.productionRuns === 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInlineForm(order.id, linesWithoutRuns, "single", line);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shrink-0"
                                    style={{ backgroundColor: "hsl(25 95% 53%)" }}
                                  >
                                    Start Run
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* ── Step 2: Inline manufacturing form (inside the card) ── */}
                      {isInlineFormOpen && (
                        <div className="px-5 py-4 bg-secondary/10">
                          <div className="flex items-center gap-2 mb-3">
                            <ChevronRight size={12} className="text-primary" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                              {inlineSelectedLines.length > 1
                                ? `Setting up run for ${inlineSelectedLines.length} sizes`
                                : `Setting up run for ${inlineSelectedLines[0]?.product || "—"} ${inlineSelectedLines[0]?.size || ""}`
                              }
                            </p>
                          </div>
                          <ManufacturingForm
                            lines={inlineSelectedLines}
                            onSubmit={handleInlineCreate}
                            onCancel={closeInlineForm}
                            submitLabel={inlineSelectedLines.length > 1 ? `Create Run (${inlineSelectedLines.length} sizes)` : "Create Run"}
                          />
                        </div>
                      )}

                      {/* Footer link */}
                      <div className="px-5 py-2 bg-secondary/20">
                        <Link href={`/orders/${order.id}`} className="text-[10px] text-primary hover:underline">View full order details →</Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pipeline / Kanban View ── */}
      {viewMode === "pipeline" && (
        <>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none -mx-2 px-2">
            {statusOrder.filter((s) => visibleColumns.has(s)).map((status) => {
              const display = RUN_STATUS_DISPLAY[status];
              // "Received" column: show both RECEIVED and legacy COMPLETED runs
              const columnRuns = status === "RECEIVED"
                ? filtered.filter((r) => (r.status === "RECEIVED" || r.status === "COMPLETED") && isRecentlyCompleted(r))
                : filtered.filter((r) => r.status === status);
              const isDoneColumn = status === "RECEIVED";
              return (
                <div
                  key={status}
                  className="flex flex-col w-[calc(100vw-48px)] sm:w-[220px] shrink-0 bg-card border border-border rounded-xl overflow-hidden"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/30"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary/30"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("ring-2", "ring-primary/30");
                    if (dragRunId) handleDrop(dragRunId, status);
                  }}
                >
                  {/* Column header */}
                  <div className="px-3 py-2.5 border-b border-border bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-foreground">
                        {isDoneColumn ? "Received" : (display?.label || status)}
                      </span>
                      <span className="text-[9px] font-mono-brand text-muted-foreground tabular-nums">{columnRuns.length}</span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[60vh] overflow-y-auto">
                    {columnRuns.map((run) => (
                      <div
                        key={run.id}
                        draggable
                        onDragStart={() => setDragRunId(run.id)}
                        onDragEnd={() => setDragRunId(null)}
                        className={`bg-background border rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:border-foreground/20 transition-all ${
                          dragRunId === run.id ? "opacity-50 scale-95" : ""
                        } ${run.expectedExFactory && new Date(run.expectedExFactory) < new Date() && run.status !== "RECEIVED" && run.status !== "COMPLETED" ? "border-badge-red-text/40 bg-badge-red-bg/10" : "border-border"}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GripVertical size={10} className="text-muted-foreground/40 shrink-0" />
                          <Link href={`/production-runs/${run.id}`} className="text-[11px] font-semibold text-foreground hover:underline truncate">
                            {run.runCode}
                          </Link>
                        </div>
                        <p className="text-[9px] text-muted-foreground truncate mb-1">
                          {run.productName || run.orderLine?.product || "—"}
                          {run.productColor && <span className="text-foreground"> · {run.productColor}</span>}
                        </p>
                        {/* Size breakdown */}
                        {run.sizeBreakdown.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-1">
                            {run.sizeBreakdown.map((sb) => (
                              <span key={sb.id} className="text-[7px] font-mono-brand px-1 py-0.5 rounded bg-secondary text-foreground">
                                {sb.size.split(" - ")[0] || sb.size} <span className="text-muted-foreground">×{sb.quantity}</span>
                              </span>
                            ))}
                          </div>
                        ) : run.productSize && (
                          <p className="text-[8px] text-muted-foreground mb-1">Size: {run.productSize}</p>
                        )}
                        {(run.order || run.orderLine) && (
                          <p className="text-[8px] text-muted-foreground/60 truncate">
                            {run.order?.orderRef || run.orderLine?.order.orderRef}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono-brand text-muted-foreground tabular-nums">{run.unitsProduced}/{run.quantity}</span>
                          {run.supplier && (
                            <span className="text-[8px] text-muted-foreground truncate max-w-[80px]">{run.supplier.name}</span>
                          )}
                        </div>
                        {run.quantity > 0 && (
                          <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(run.unitsProduced / run.quantity) * 100}%`,
                                backgroundColor: "hsl(142 76% 36%)",
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          {run.status === "QC" && (
                            <Link
                              href={`/production-runs/${run.id}/scan`}
                              className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: "hsl(25 95% 53%)" }}
                            >
                              Scan
                            </Link>
                          )}
                          {/* SHIPPED: inline receipt confirmation */}
                          {run.status === "SHIPPED" && isAdmin && receiptRunId !== run.id && (
                            <button
                              onClick={() => setReceiptRunId(run.id)}
                              className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: "hsl(142 76% 36%)" }}
                            >
                              ✓ Receive
                            </button>
                          )}
                          <Link href={`/production-runs/${run.id}`} className="text-[8px] text-primary hover:underline">
                            Details
                          </Link>
                        </div>
                        {/* Inline receipt confirmation */}
                        {run.status === "SHIPPED" && receiptRunId === run.id && (
                          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                            <p className="text-[9px] font-semibold text-foreground">Confirm goods received?</p>
                            <p className="text-[8px] text-muted-foreground">This will mark the run as Received.</p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setReceiptRunId(null);
                                  startTransition(async () => {
                                    await updateProductionRun(run.id, { status: "RECEIVED" });
                                    router.refresh();
                                  });
                                }}
                                disabled={isPending}
                                className="flex-1 py-1 rounded text-[9px] font-bold text-white disabled:opacity-50"
                                style={{ backgroundColor: "hsl(142 76% 36%)" }}
                              >
                                {isPending ? "..." : "Confirm"}
                              </button>
                              <button
                                onClick={() => setReceiptRunId(null)}
                                className="px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-foreground border border-border"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {columnRuns.length === 0 && (
                      <div className="flex items-center justify-center h-20 text-[9px] text-muted-foreground/40">
                        {isDoneColumn ? "No recent receipts" : "Drop here"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Archive toggle ── */}
          {isAdmin && (
            <div className="mt-2">
              <button
                onClick={() => setArchiveOpen((v) => !v)}
                className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className={`transition-transform ${archiveOpen ? "rotate-90" : ""}`}>›</span>
                Archive
                <span className="text-[9px] font-mono-brand">
                  ({filtered.filter((r) => (r.status === "RECEIVED" || r.status === "COMPLETED") && !isRecentlyCompleted(r)).length})
                </span>
              </button>
              {archiveOpen && (
                <div className="mt-3 bg-card border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border bg-secondary/20">
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Received — older than 7 days</p>
                  </div>
                  <div className="divide-y divide-border">
                    {filtered
                      .filter((r) => (r.status === "RECEIVED" || r.status === "COMPLETED") && !isRecentlyCompleted(r))
                      .map((run) => (
                        <Link
                          key={run.id}
                          href={`/production-runs/${run.id}`}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-foreground">{run.runCode}</p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {run.productName || run.orderLine?.product || "—"}
                              {run.supplier ? ` · ${run.supplier.name}` : ""}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono-brand text-muted-foreground tabular-nums">{run.quantity} units</span>
                          <span className="text-[9px] text-muted-foreground">{new Date(run.updatedAt ?? run.createdAt).toLocaleDateString()}</span>
                        </Link>
                      ))}
                    {filtered.filter((r) => r.status === "COMPLETED" && !isRecentlyCompleted(r)).length === 0 && (
                      <p className="px-4 py-6 text-[11px] text-muted-foreground text-center">No archived runs yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── List View ── */}
      {viewMode === "list" && (
      <div className="space-y-2">
        {filtered.map((run) => {
          const isExpanded = expandedId === run.id;
          return (
            <div key={run.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(isExpanded ? null : run.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-foreground">{run.runCode}</p>
                    <StatusBadge display={RUN_STATUS_DISPLAY[run.status] || RUN_STATUS_DISPLAY.PLANNED} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {run.orderLine ? `${run.orderLine.order.orderRef} · ${run.orderLine.product}` : "No order linked"}
                  </p>
                </div>
                {/* Supplier badge */}
                <div className="hidden sm:block">
                  {run.supplier ? (
                    <Badge label={run.supplier.name} bgClass="bg-badge-blue-bg" textClass="text-badge-blue-text" />
                  ) : (
                    <Badge label="Unassigned" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                  )}
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-[14px] font-bold font-mono-brand tabular-nums">{run.quantity}</p>
                  <p className="text-[9px] text-muted-foreground">units</p>
                </div>
                <Badge label={`${run._count.garments} tagged`} bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
                {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </button>

              {isExpanded && (
                <div className="border-t border-border px-5 py-4 bg-secondary/20 space-y-3">
                  {/* Admin: assign supplier if unassigned */}
                  {isAdmin && !run.supplier && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-badge-orange-bg/30">
                      <Building2 size={12} className="text-badge-orange-text shrink-0" />
                      <span className="text-[10px] text-badge-orange-text font-medium">Assign supplier:</span>
                      <select
                        defaultValue=""
                        onChange={(e) => { if (e.target.value) handleAssignSupplier(run.id, parseInt(e.target.value)); }}
                        disabled={isPending}
                        className="flex-1 max-w-xs px-2.5 py-1 bg-card border border-border rounded-lg text-[11px] text-foreground outline-none"
                      >
                        <option value="">Select...</option>
                        {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.type})</option>)}
                      </select>
                    </div>
                  )}

                  {/* Config grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Washing", value: run.washingProgram },
                      { label: "Temperature", value: run.washingTemperature != null ? `${run.washingTemperature}°C` : null },
                      { label: "Stitch Type", value: run.stitchType },
                      { label: "Gauge", value: run.machineGauge },
                      { label: "Start", value: run.startDate ? formatDate(run.startDate) : null },
                      { label: "Ex-Factory", value: run.expectedExFactory ? formatDate(run.expectedExFactory) : null },
                      { label: "Produced", value: `${run.unitsProduced} / ${run.quantity}` },
                      { label: "Supplier", value: run.supplier?.name },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                        <p className="text-[11px] text-foreground">{value || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {run.yarnCompositions.length > 0 && (
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Yarn Composition</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {run.yarnCompositions.map((y) => (
                          <Badge key={y.id} label={`${y.yarnType} ${y.percentage}%`} bgClass="bg-badge-purple-bg" textClass="text-badge-purple-text" />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    {["IN_PRODUCTION", "QC", "READY_TO_SHIP", "SHIPPED"].includes(run.status) && (
                      <Link
                        href={`/production-runs/${run.id}/scan`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white"
                        style={{ backgroundColor: "hsl(25 95% 53%)" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                        Scan
                      </Link>
                    )}
                    <Link href={`/production-runs/${run.id}`} className="text-[10px] font-semibold text-primary hover:underline">
                      Details
                    </Link>
                    {run.status === "PLANNED" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this planned run?")) {
                            startTransition(async () => {
                              const { deleteProductionRun } = await import("@/lib/actions/production-runs");
                              const result = await deleteProductionRun(run.id);
                              if (result.success) {
                                router.refresh();
                              } else {
                                alert(result.error ?? "Failed to delete run");
                              }
                            });
                          }
                        }}
                        disabled={isPending}
                        className="text-[8px] text-destructive hover:underline disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <Factory size={24} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-[13px] font-semibold text-foreground mb-1">No runs found</p>
            <p className="text-[11px] text-muted-foreground">Create a production run to get started</p>
          </div>
        )}
      </div>
      )}
      {!isAdmin && (
        <ContextualHelp
          pageId="production-runs"
          title="Production Runs"
          steps={[
            { icon: "📋", text: "Check 'Orders Ready to Start' for new work from Sheep Inc" },
            { icon: "▶️", text: "Tap an order, then 'Start All Sizes' or pick individual sizes" },
            { icon: "🧶", text: "Choose your yarn lot and fill in washing, finishing details" },
            { icon: "📱", text: "Once a run is created, tap 'Scan' to tag each garment" },
            { icon: "📦", text: "When done, move the run to 'Ready to Ship' then 'Shipped'" },
          ]}
          tip="Use List view on mobile — it's easier to use than the Pipeline columns."
        />
      )}
    </div>
  );
}
