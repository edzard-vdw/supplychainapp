"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronRight, ScanLine, Check, Lock, Package } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import {
  RUN_STATUS_DISPLAY,
  RUN_STATUS_ORDER,
  getAllowedTransitions,
  isAdminOnlyStatus,
  formatDate,
} from "@/types/supply-chain";
import { updateProductionRun, generateBatchTag, startProduction } from "@/lib/actions/production-runs";

// ─── Types ───────────────────────────────────────────────────────────────────

type YarnLot = {
  id: number;
  colourCode: string;
  colourName: string | null;
  lotNumber: string | null;
  yarnType: string;
  remainingKg: number;
  delivery: { deliveryNoteRef: string };
};

type RunFull = {
  id: number;
  runCode: string;
  status: string;
  quantity: number;
  unitsProduced: number;
  productName: string | null;
  productColor: string | null;
  productSize: string | null;
  individualTagging: boolean;
  batchQrCode: string | null;
  batchNfcTag: string | null;
  // Manufacturing (entered at IN_PRODUCTION)
  yarnColourCode: string | null; // colour code from yarn delivery line
  yarnLotNumber: string | null;  // lot number from yarn delivery line
  washingProgram: string | null;
  washingTemperature: number | null;
  machineGauge: string | null;
  knitwearPly: string | null;
  stitchType: string | null;
  // QC stage
  finisherName: string | null;
  finishedDate: string | null;
  // Dates
  startDate: string | null;
  expectedExFactory: string | null;
  actualCompletion: string | null;
  notes: string | null;
  // Relations
  supplier: { id: number; name: string } | null;
  order: { id: number; orderRef: string; client: string | null; dueDate: string | null } | null;
  orderLine: {
    product: string;
    order: { orderRef: string } | null;
    color: { name: string; hexValue: string | null } | null;
  } | null;
  sizeBreakdown: { id: number; orderLineId: number | null; size: string; sku: string | null; quantity: number; produced: number }[];
  yarnCompositions: { id: number; yarnType: string; percentage: number }[];
  garments: { id: number; garmentCode: string; isTagged: boolean }[];
  _count: { garments: number };
};

type OrderLineWithColor = {
  id: number;
  colorId: number | null;
  size: string | null;
  quantity: number;
  color: { name: string; hexValue: string | null } | null;
};

type UniqueColor = {
  colorId: number;
  name: string;
  hexValue: string | null;
  quantity: number;
};

// ─── Colour Swatch ───────────────────────────────────────────────────────────

function ColorSwatch({ hexValue, name, size = "md" }: { hexValue: string | null; name: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  return (
    <div
      className={`${sz} rounded-full border border-border shrink-0`}
      style={{ backgroundColor: hexValue ?? "#ccc" }}
      title={name}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function RunDetailClient({
  run,
  orderLines,
  yarnLots,
  role,
}: {
  run: RunFull;
  orderLines: OrderLineWithColor[];
  yarnLots: YarnLot[];
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Derive unique colors from the run's sizeBreakdown + orderLines ──
  const uniqueColors = useMemo<UniqueColor[]>(() => {
    const lineToColor = new Map<number, { id: number; name: string; hexValue: string | null }>();
    orderLines.forEach((ol) => {
      if (ol.colorId && ol.color) {
        lineToColor.set(ol.id, { id: ol.colorId, name: ol.color.name, hexValue: ol.color.hexValue });
      }
    });
    const colorMap = new Map<number, UniqueColor>();
    run.sizeBreakdown.forEach((sb) => {
      if (!sb.orderLineId) return;
      const color = lineToColor.get(sb.orderLineId);
      if (!color) return;
      const existing = colorMap.get(color.id);
      if (existing) {
        existing.quantity += sb.quantity;
      } else {
        colorMap.set(color.id, { colorId: color.id, name: color.name, hexValue: color.hexValue, quantity: sb.quantity });
      }
    });
    return Array.from(colorMap.values());
  }, [run.sizeBreakdown, orderLines]);

  // ── Status helpers ──
  const allowedStatuses = getAllowedTransitions(run.status, role);
  const currentIdx = RUN_STATUS_ORDER.indexOf(run.status as typeof RUN_STATUS_ORDER[number]);

  // ── "Start Production" modal state ──
  const [showStartModal, setShowStartModal] = useState(false);
  const [startStep, setStartStep] = useState<1 | 2>(1);
  const [allColors, setAllColors] = useState(true);
  const [selectedColorIds, setSelectedColorIds] = useState<number[]>([]);
  const [selectedYarnLineId, setSelectedYarnLineId] = useState<number | null>(null);
  const [mfgForm, setMfgForm] = useState({
    machineGauge: "",
    knitwearPly: "",
    stitchType: "",
    washingProgram: "",
    washingTemperature: "",
    expectedExFactory: "",
  });

  // ── QC: finisher name ──
  const [finisherNameInput, setFinisherNameInput] = useState(run.finisherName ?? "");
  const [savingFinisher, setSavingFinisher] = useState(false);

  // ── Confirm status change (for backward moves or admin actions) ──
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  // ── Inline ex-factory date edit (IN_PRODUCTION, if not set) ──
  const [exFactoryInput, setExFactoryInput] = useState(
    run.expectedExFactory ? run.expectedExFactory.slice(0, 10) : ""
  );
  function handleSaveExFactory() {
    if (!exFactoryInput) return;
    startTransition(async () => {
      await updateProductionRun(run.id, { expectedExFactory: exFactoryInput });
      router.refresh();
    });
  }

  function handleMfgChange(field: keyof typeof mfgForm, value: string) {
    setMfgForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleColor(colorId: number) {
    setSelectedColorIds((prev) =>
      prev.includes(colorId) ? prev.filter((id) => id !== colorId) : [...prev, colorId]
    );
  }

  function openStartModal() {
    setStartStep(1);
    setAllColors(true);
    setSelectedColorIds([]);
    setSelectedYarnLineId(null);
    setMfgForm({ machineGauge: "", knitwearPly: "", stitchType: "", washingProgram: "", washingTemperature: "", expectedExFactory: "" });
    setShowStartModal(true);
  }

  function handleStartStep1Next() {
    if (!allColors && selectedColorIds.length === 0) return;
    setStartStep(2);
  }

  function handleConfirmStartProduction() {
    const selectedYarnLine = yarnLots.find((l) => l.id === selectedYarnLineId) ?? null;
    startTransition(async () => {
      const result = await startProduction(run.id, {
        selectedColorIds: allColors ? null : selectedColorIds,
        yarnColourCode: selectedYarnLine?.colourCode ?? null,
        yarnLotNumber: selectedYarnLine?.lotNumber ?? null,
        machineGauge: mfgForm.machineGauge || null,
        knitwearPly: mfgForm.knitwearPly || null,
        stitchType: mfgForm.stitchType || null,
        washingProgram: mfgForm.washingProgram || null,
        washingTemperature: mfgForm.washingTemperature ? parseFloat(mfgForm.washingTemperature) : null,
        expectedExFactory: mfgForm.expectedExFactory || null,
      });
      setShowStartModal(false);
      if (result.success && result.runId) {
        router.push(`/production-runs/${result.runId}`);
        router.refresh();
      } else {
        alert(result.error ?? "Failed to start production");
      }
    });
  }

  function handleStatusAdvance(newStatus: string) {
    if (!allowedStatuses.includes(newStatus)) return;
    startTransition(async () => {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "SHIPPED" && run.status === "QC") {
        // Auto-set finishedDate when completing QC / moving to SHIPPED
        updateData.finishedDate = new Date().toISOString();
        if (finisherNameInput && !run.finisherName) {
          updateData.finisherName = finisherNameInput;
        }
      }
      await updateProductionRun(run.id, updateData);
      router.refresh();
    });
  }

  function handleSaveFinisher() {
    setSavingFinisher(true);
    startTransition(async () => {
      await updateProductionRun(run.id, { finisherName: finisherNameInput });
      setSavingFinisher(false);
      router.refresh();
    });
  }

  function handleGenerateBatchTag(type: "qr" | "nfc") {
    startTransition(async () => {
      await generateBatchTag(run.id, type);
      router.refresh();
    });
  }

  const orderRef = run.order?.orderRef ?? run.orderLine?.order?.orderRef ?? "—";
  const client = run.order?.client;
  const dueDate = run.order?.dueDate;
  const productName = run.productName ?? run.orderLine?.product ?? "—";

  // ── Grouped size breakdown with color info ──
  const lineToColor = useMemo(() => {
    const map = new Map<number, { name: string; hexValue: string | null }>();
    orderLines.forEach((ol) => {
      if (ol.colorId && ol.color) map.set(ol.id, ol.color);
    });
    return map;
  }, [orderLines]);

  return (
    <div className="px-4 py-6 max-w-[700px] mx-auto pb-28">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/production-runs"
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[18px] font-bold uppercase tracking-wide text-foreground">{run.runCode}</h1>
            <StatusBadge display={RUN_STATUS_DISPLAY[run.status] ?? RUN_STATUS_DISPLAY.PLANNED} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {orderRef} · {productName}
          </p>
        </div>
        {run.status === "PLANNED" && (
          <button
            onClick={() => {
              if (confirm("Delete this planned run? This cannot be undone.")) {
                startTransition(async () => {
                  const { deleteProductionRun } = await import("@/lib/actions/production-runs");
                  const r = await deleteProductionRun(run.id);
                  if (r.success) router.push("/production-runs");
                  else alert(r.error ?? "Failed to delete");
                });
              }
            }}
            disabled={isPending}
            className="text-[10px] font-semibold text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            Delete
          </button>
        )}
      </div>

      {/* ── Status Pipeline (compact) ── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-5 overflow-x-auto">
        <div className="flex items-center min-w-max gap-0">
          {RUN_STATUS_ORDER.map((status, i) => {
            const display = RUN_STATUS_DISPLAY[status];
            const isCurrent = run.status === status;
            const isPast = i < currentIdx;
            const canSet = allowedStatuses.includes(status) && !isCurrent;
            const isAdminOnly = isAdminOnlyStatus(status);

            return (
              <div key={status} className="flex items-center">
                {i > 0 && (
                  <div className={`w-5 h-0.5 shrink-0 ${isPast ? "bg-badge-green-text" : "bg-border"}`} />
                )}
                <button
                  onClick={() => canSet ? setConfirmStatus(status) : undefined}
                  disabled={isPending || !canSet}
                  className={`relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg transition-all shrink-0 ${
                    isCurrent
                      ? "bg-foreground text-background"
                      : isPast
                        ? "bg-badge-green-bg text-badge-green-text cursor-pointer hover:scale-105"
                        : canSet
                          ? "bg-secondary/50 text-foreground cursor-pointer hover:bg-secondary"
                          : "bg-muted/30 text-muted-foreground/40"
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                    isCurrent ? "bg-background text-foreground" :
                    isPast ? "bg-badge-green-text text-white" : "bg-muted/50"
                  }`}>
                    {isPast ? <Check size={10} /> : isAdminOnly && role !== "ADMIN" ? <Lock size={8} /> : i + 1}
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-wide whitespace-nowrap">
                    {display?.label ?? status}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm status change dialog */}
      {confirmStatus && (
        <div className="bg-card border-2 border-foreground/20 rounded-xl p-4 mb-5">
          <p className="text-[12px] font-semibold text-foreground mb-1">Confirm status change</p>
          <p className="text-[11px] text-muted-foreground mb-3">
            Move this run to &ldquo;{RUN_STATUS_DISPLAY[confirmStatus]?.label}&rdquo;?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { handleStatusAdvance(confirmStatus); setConfirmStatus(null); }}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {isPending ? "Updating…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmStatus(null)}
              className="px-4 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── PO Summary (always shown) ── */}
      <div className="bg-card border border-border rounded-xl p-5 mb-5">
        <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Purchase Order</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Order Ref</p>
            <p className="text-[13px] font-bold text-foreground">{orderRef}</p>
          </div>
          {client && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Client</p>
              <p className="text-[13px] font-semibold text-foreground">{client}</p>
            </div>
          )}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Due Date</p>
            <p className="text-[13px] font-semibold text-foreground">{dueDate ? formatDate(dueDate) : "—"}</p>
          </div>
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Total Units</p>
            <p className="text-[20px] font-bold tabular-nums text-foreground leading-tight">{run.quantity.toLocaleString()}</p>
          </div>
        </div>

        {/* Colour swatches */}
        {uniqueColors.length > 0 && (
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Colours</p>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map((c) => (
                <div
                  key={c.colorId}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/50 border border-border"
                >
                  <ColorSwatch hexValue={c.hexValue} name={c.name} size="sm" />
                  <span className="text-[11px] font-medium text-foreground">{c.name}</span>
                  <span className="text-[10px] text-muted-foreground">{c.quantity.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PLANNED: CTA moved to sticky bottom bar ── */}

      {/* ── IN_PRODUCTION: Manufacturing Details + Progress ── */}
      {run.status === "IN_PRODUCTION" && (
        <>
          {/* Manufacturing details */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Manufacturing Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: "Yarn Colour", value: run.yarnColourCode },
                { label: "Yarn Lot", value: run.yarnLotNumber },
                { label: "Machine Gauge", value: run.machineGauge },
                { label: "Knitwear Ply", value: run.knitwearPly },
                { label: "Stitch Type", value: run.stitchType },
                { label: "Washing Program", value: run.washingProgram },
                { label: "Temperature", value: run.washingTemperature != null ? `${run.washingTemperature}°C` : null },
                { label: "Start Date", value: formatDate(run.startDate) },
                ...(run.expectedExFactory ? [{ label: "Expected Ex-Factory", value: formatDate(run.expectedExFactory) }] : []),
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-[12px] text-foreground">{value || "—"}</p>
                </div>
              ))}
              {/* Inline ex-factory edit if not yet set */}
              {!run.expectedExFactory && (
                <div className="col-span-2 mt-1">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Expected Ex-Factory</p>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={exFactoryInput}
                      onChange={(e) => setExFactoryInput(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                    />
                    <button
                      onClick={handleSaveExFactory}
                      disabled={!exFactoryInput || isPending}
                      className="px-3 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold disabled:opacity-40"
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          <div className="bg-card border border-border rounded-xl p-5 mb-5">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Progress</p>
            <div className="flex items-end gap-3 mb-3">
              <p className="text-[32px] font-bold tabular-nums leading-none text-foreground">
                {run.unitsProduced}
              </p>
              <p className="text-[16px] text-muted-foreground mb-1">/ {run.quantity} units</p>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-badge-orange-text transition-all"
                style={{ width: `${run.quantity > 0 ? (run.unitsProduced / run.quantity) * 100 : 0}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Scanning is unlocked at the Quality Check / Scan stage.
            </p>
          </div>

        </>
      )}

      {/* ── QC: Scanning FIRST, finisher below ── */}
      {run.status === "QC" && (
        <>
          {/* Scanning card — PRIMARY, at top */}
          <div className="bg-card border-2 border-foreground/20 rounded-xl p-5 mb-5">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">QC / Scan</p>

            {/* Who is scanning — finisher name prompt */}
            <div className="mb-4">
              <label className="block text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
                Who is scanning?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={finisherNameInput}
                  onChange={(e) => setFinisherNameInput(e.target.value)}
                  placeholder="Finisher / operator name…"
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
                {finisherNameInput !== run.finisherName && finisherNameInput && (
                  <button
                    onClick={handleSaveFinisher}
                    disabled={isPending || savingFinisher}
                    className="px-3 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold disabled:opacity-50"
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Big scan button */}
            <Link
              href={`/production-runs/${run.id}/scan`}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-foreground text-background text-[13px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity mb-4"
            >
              <ScanLine size={18} strokeWidth={2} />
              Open Scanner
            </Link>

            {/* Progress */}
            <div className="flex items-end gap-3 mb-2">
              <p className="text-[28px] font-bold tabular-nums leading-none text-foreground">
                {run.unitsProduced}
              </p>
              <p className="text-[14px] text-muted-foreground mb-0.5">/ {run.quantity} units scanned</p>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-badge-purple-text transition-all"
                style={{ width: `${run.quantity > 0 ? (run.unitsProduced / run.quantity) * 100 : 0}%` }}
              />
            </div>

            {/* Batch scan — secondary */}
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package size={16} className="text-muted-foreground" strokeWidth={1.5} />
                  <div>
                    <p className="text-[12px] font-bold text-foreground">Batch QR</p>
                    <p className="text-[10px] text-muted-foreground">One tag for the entire run</p>
                  </div>
                </div>
                {run.batchQrCode ? (
                  <span className="px-3 py-1.5 rounded-lg bg-badge-green-bg text-badge-green-text text-[10px] font-bold uppercase tracking-wider">
                    Generated ✓
                  </span>
                ) : (
                  <button
                    onClick={() => handleGenerateBatchTag("qr")}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg border border-border text-[10px] font-bold uppercase tracking-wider text-foreground disabled:opacity-50"
                  >
                    Generate QR
                  </button>
                )}
              </div>
              {run.batchQrCode && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                  <img
                    src={`/api/qr/generate?data=${encodeURIComponent(run.batchQrCode)}`}
                    alt="Batch QR"
                    className="w-12 h-12 bg-white rounded-lg p-0.5 shrink-0"
                  />
                  <p className="text-[10px] font-mono text-muted-foreground break-all">{run.batchQrCode.slice(0, 40)}…</p>
                </div>
              )}
            </div>
          </div>

          {/* Finisher summary (if set) */}
          {run.finishedDate && (
            <div className="bg-card border border-border rounded-xl p-5 mb-5">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Scan Record</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Finisher</p>
                  <p className="text-[13px] font-semibold text-foreground">{run.finisherName || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Finished</p>
                  <p className="text-[13px] font-semibold text-foreground">{formatDate(run.finishedDate)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SHIPPED ── */}
      {run.status === "SHIPPED" && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Shipping</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Finisher</p>
              <p className="text-[13px] font-semibold text-foreground">{run.finisherName || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Finished Date</p>
              <p className="text-[13px] font-semibold text-foreground">{formatDate(run.finishedDate)}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Expected Ex-Factory</p>
              <p className="text-[13px] font-semibold text-foreground">{formatDate(run.expectedExFactory)}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Units</p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{run.quantity.toLocaleString()}</p>
            </div>
          </div>
          {role !== "ADMIN" && (
            <p className="text-[11px] text-muted-foreground text-center">Awaiting receipt confirmation from admin</p>
          )}
        </div>
      )}

      {/* ── RECEIVED ── */}
      {(run.status === "RECEIVED" || run.status === "COMPLETED") && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Received</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Units</p>
              <p className="text-[20px] font-bold tabular-nums text-foreground">{run.quantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">Tagged</p>
              <p className="text-[20px] font-bold tabular-nums text-badge-green-text">{run._count.garments}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Size Breakdown Table (always) ── */}
      {run.sizeBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-5">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Size Breakdown</p>
          </div>
          <table className="w-full text-[12px]">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-left px-4 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Colour</th>
                <th className="text-left px-3 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Size</th>
                <th className="text-right px-4 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Ordered</th>
                {run.status !== "PLANNED" && (
                  <th className="text-right px-4 py-2.5 text-[9px] font-mono uppercase tracking-wider text-muted-foreground">Produced</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {run.sizeBreakdown.map((sb) => {
                const color = sb.orderLineId ? lineToColor.get(sb.orderLineId) : null;
                return (
                  <tr key={sb.id}>
                    <td className="px-4 py-2.5">
                      {color ? (
                        <div className="flex items-center gap-1.5">
                          <ColorSwatch hexValue={color.hexValue} name={color.name} size="sm" />
                          <span className="text-muted-foreground">{color.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{sb.size}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-right text-foreground">{sb.quantity}</td>
                    {run.status !== "PLANNED" && (
                      <td className="px-4 py-2.5 font-mono tabular-nums text-right text-foreground">{sb.produced}</td>
                    )}
                  </tr>
                );
              })}
              <tr className="bg-secondary/20 font-bold">
                <td className="px-4 py-2.5 text-foreground" colSpan={2}>Total</td>
                <td className="px-4 py-2.5 font-mono tabular-nums text-right text-foreground">
                  {run.sizeBreakdown.reduce((s, sb) => s + sb.quantity, 0)}
                </td>
                {run.status !== "PLANNED" && (
                  <td className="px-4 py-2.5 font-mono tabular-nums text-right text-foreground">
                    {run.sizeBreakdown.reduce((s, sb) => s + sb.produced, 0)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── Manufacturing details (shown from IN_PRODUCTION onward, collapsed) ── */}
      {["QC", "SHIPPED", "RECEIVED"].includes(run.status) && (run.yarnColourCode || run.machineGauge || run.washingProgram) && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Manufacturing</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {[
              { label: "Yarn Colour", value: run.yarnColourCode },
              { label: "Yarn Lot", value: run.yarnLotNumber },
              { label: "Machine Gauge", value: run.machineGauge },
              { label: "Knitwear Ply", value: run.knitwearPly },
              { label: "Stitch Type", value: run.stitchType },
              { label: "Washing Program", value: run.washingProgram },
              { label: "Temperature", value: run.washingTemperature != null ? `${run.washingTemperature}°C` : null },
            ]
              .filter(({ value }) => value)
              .map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-[12px] text-foreground">{value}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Garments (shown in QC+) ── */}
      {["QC", "SHIPPED", "RECEIVED"].includes(run.status) && (
        <div className="bg-card border border-border rounded-xl p-5 mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
            Garments ({run._count.garments})
          </p>
          {run.garments.length > 0 ? (
            <div className="space-y-1">
              {run.garments.map((g) => (
                <Link
                  key={g.id}
                  href={`/garments/${g.id}`}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                >
                  <span className="text-[12px] font-mono text-foreground flex-1">{g.garmentCode}</span>
                  {g.isTagged ? (
                    <Badge label="Tagged" bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
                  ) : (
                    <Badge label="Untagged" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">No garments scanned yet.</p>
          )}
        </div>
      )}

      {/* ── Stage CTA — inline on desktop, sticky on mobile ── */}
      {(() => {
        let btn: React.ReactNode = null;
        if (run.status === "PLANNED") {
          btn = (
            <button onClick={openStartModal} disabled={isPending}
              className="w-full py-4 rounded-xl bg-foreground text-background text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              Start Production <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          );
        } else if (run.status === "IN_PRODUCTION" && allowedStatuses.includes("QC")) {
          btn = (
            <button onClick={() => handleStatusAdvance("QC")} disabled={isPending}
              className="w-full py-4 rounded-xl bg-badge-purple-text text-white text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isPending ? "Updating…" : <>"Production Complete → QC / Scan" <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          );
        } else if (run.status === "QC" && allowedStatuses.includes("SHIPPED")) {
          btn = (
            <button onClick={() => handleStatusAdvance("SHIPPED")} disabled={isPending}
              className="w-full py-4 rounded-xl bg-badge-sky-text text-white text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isPending ? "Updating…" : <>"Scanning Complete → Ship" <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          );
        } else if (run.status === "SHIPPED" && role === "ADMIN" && allowedStatuses.includes("RECEIVED")) {
          btn = (
            <button onClick={() => handleStatusAdvance("RECEIVED")} disabled={isPending}
              className="w-full py-4 rounded-xl bg-badge-blue-text text-white text-[13px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {isPending ? "Updating…" : <>"Confirm Goods Received" <ChevronRight size={16} strokeWidth={2.5} /></>}
            </button>
          );
        }
        if (!btn) return null;
        return (
          <>
            {/* Desktop: inline at bottom of content */}
            <div className="hidden md:block mt-2 mb-4">{btn}</div>

            {/* Mobile: fixed bar above browser chrome */}
            <div
              className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border px-4 pt-3"
              style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
            >
              <div className="max-w-[700px] mx-auto">{btn}</div>
            </div>
          </>
        );
      })()}

      {/* ── "Start Production" modal overlay ── */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Step {startStep} of 2
                </p>
                <h2 className="text-[15px] font-bold text-foreground">
                  {startStep === 1 ? "Select Colours" : "Manufacturing Details"}
                </h2>
              </div>
              <button
                onClick={() => setShowStartModal(false)}
                className="text-muted-foreground hover:text-foreground text-[20px] leading-none px-2"
              >
                ×
              </button>
            </div>

            <div className="px-5 py-4">
              {/* ── Step 1: Colour picker ── */}
              {startStep === 1 && (
                <>
                  {uniqueColors.length > 0 ? (
                    <>
                      <p className="text-[11px] text-muted-foreground mb-4">
                        Which colours do you want to put into production? You can start all at once or run one colour first.
                      </p>

                      {/* All colours option */}
                      <button
                        onClick={() => { setAllColors(true); setSelectedColorIds([]); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 mb-3 transition-colors ${
                          allColors
                            ? "border-foreground bg-foreground/5"
                            : "border-border hover:border-foreground/30"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          allColors ? "border-foreground bg-foreground" : "border-muted-foreground"
                        }`}>
                          {allColors && <Check size={12} className="text-background" />}
                        </div>
                        <div className="text-left">
                          <p className="text-[13px] font-bold text-foreground">All Colours</p>
                          <p className="text-[11px] text-muted-foreground">{run.quantity} units total</p>
                        </div>
                      </button>

                      {/* Individual colour options */}
                      <div className="space-y-2">
                        {uniqueColors.map((c) => {
                          const isSelected = !allColors && selectedColorIds.includes(c.colorId);
                          return (
                            <button
                              key={c.colorId}
                              onClick={() => { setAllColors(false); toggleColor(c.colorId); }}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${
                                isSelected
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border hover:border-foreground/30"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-foreground bg-foreground" : "border-muted-foreground"
                              }`}>
                                {isSelected && <Check size={12} className="text-background" />}
                              </div>
                              <ColorSwatch hexValue={c.hexValue} name={c.name} />
                              <div className="text-left flex-1">
                                <p className="text-[13px] font-semibold text-foreground">{c.name}</p>
                                <p className="text-[11px] text-muted-foreground">{c.quantity} units</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mb-4">
                      All colours in this run will go into production together.
                    </p>
                  )}

                  <button
                    onClick={handleStartStep1Next}
                    disabled={!allColors && selectedColorIds.length === 0}
                    className="w-full mt-4 py-3 rounded-xl bg-foreground text-background text-[12px] font-bold uppercase tracking-wider disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    Next: Manufacturing Details →
                  </button>
                </>
              )}

              {/* ── Step 2: Manufacturing form ── */}
              {startStep === 2 && (
                <>
                  <p className="text-[11px] text-muted-foreground mb-4">
                    Enter the manufacturing details for this production run.
                  </p>

                  <div className="space-y-3">
                    {/* ── Yarn Stock (dropdown from delivery) ── */}
                    <div>
                      <label className="block text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                        Yarn Stock
                      </label>
                      {yarnLots.length > 0 ? (
                        <>
                          <select
                            value={selectedYarnLineId ?? ""}
                            onChange={(e) => setSelectedYarnLineId(e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                          >
                            <option value="">Select yarn lot…</option>
                            {yarnLots.map((lot) => (
                              <option key={lot.id} value={lot.id}>
                                {lot.colourName ?? lot.colourCode} ({lot.colourCode}) · Lot {lot.lotNumber} · {lot.remainingKg.toFixed(1)}kg remaining
                              </option>
                            ))}
                          </select>
                          {selectedYarnLineId && (() => {
                            const lot = yarnLots.find((l) => l.id === selectedYarnLineId);
                            if (!lot) return null;
                            return (
                              <div className="mt-2 px-3 py-2 rounded-lg bg-badge-green-bg border border-badge-green-text/20">
                                <p className="text-[10px] font-bold text-badge-green-text mb-0.5">{lot.yarnType}</p>
                                <p className="text-[10px] text-badge-green-text/80">
                                  Delivery: {lot.delivery.deliveryNoteRef} · {lot.remainingKg.toFixed(1)}kg available
                                </p>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="px-3 py-2.5 rounded-lg bg-secondary/50 border border-border text-[11px] text-muted-foreground">
                          No yarn deliveries recorded for your account. Contact admin to add stock.
                        </div>
                      )}
                    </div>

                    {/* ── Other manufacturing fields ── */}
                    {[
                      { key: "machineGauge" as const, label: "Machine Gauge", placeholder: "e.g. 7GG", type: "text" },
                      { key: "knitwearPly" as const, label: "Knitwear Ply", placeholder: "e.g. 2-ply", type: "text" },
                      { key: "stitchType" as const, label: "Stitch Type", placeholder: "e.g. Jersey, Rib, Intarsia", type: "text" },
                      { key: "washingProgram" as const, label: "Washing Program", placeholder: "e.g. Superwash", type: "text" },
                      { key: "washingTemperature" as const, label: "Temperature (°C)", placeholder: "e.g. 30", type: "number" },
                      { key: "expectedExFactory" as const, label: "Expected Ex-Factory", placeholder: "", type: "date" },
                    ].map(({ key, label, placeholder, type }) => (
                      <div key={key}>
                        <label className="block text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                          {label}
                        </label>
                        <input
                          type={type}
                          value={mfgForm[key]}
                          onChange={(e) => handleMfgChange(key, e.target.value)}
                          placeholder={placeholder}
                          className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-5">
                    <button
                      onClick={() => setStartStep(1)}
                      className="px-4 py-3 rounded-xl border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleConfirmStartProduction}
                      disabled={isPending}
                      className="flex-1 py-3 rounded-xl bg-foreground text-background text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {isPending ? "Starting…" : "Confirm & Start Production →"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
