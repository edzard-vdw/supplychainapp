"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ContextualHelp } from "@/components/ui/contextual-help";
import { ArrowLeft, Check, Lock, ScanLine, Package, Info } from "lucide-react";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { RUN_STATUS_DISPLAY, RUN_STATUS_ORDER, getAllowedTransitions, isAdminOnlyStatus, formatDate } from "@/types/supply-chain";
import { updateProductionRun, generateBatchTag } from "@/lib/actions/production-runs";

type RunFull = {
  id: number;
  runCode: string;
  status: string;
  quantity: number;
  unitsProduced: number;
  sku: string | null;
  productName: string | null;
  productColor: string | null;
  productSize: string | null;
  individualTagging: boolean;
  batchQrCode: string | null;
  batchNfcTag: string | null;
  washingProgram: string | null;
  washingTemperature: number | null;
  finishingProcess: string | null;
  machineGauge: string | null;
  knitwearPly: string | null;
  finisherName: string | null;
  finishedDate: string | null;
  startDate: string | null;
  expectedCompletion: string | null;
  actualCompletion: string | null;
  notes: string | null;
  supplier: { id: number; name: string } | null;
  orderLine: {
    product: string;
    order: { orderRef: string } | null;
    color: { name: string; hexValue: string | null } | null;
  } | null;
  order: { orderRef: string } | null;
  sizeBreakdown: { id: number; size: string; sku: string | null; quantity: number; produced: number }[];
  yarnCompositions: { id: number; yarnType: string; percentage: number }[];
  garments: { id: number; garmentCode: string; isTagged: boolean }[];
  _count: { garments: number };
};

export function RunDetailClient({ run, role }: { run: RunFull; role: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBatchGenerate, setShowBatchGenerate] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  const taggedCount = run.garments.filter((g) => g.isTagged).length;
  const allowedStatuses = getAllowedTransitions(run.status, role);
  const currentIdx = RUN_STATUS_ORDER.indexOf(run.status as typeof RUN_STATUS_ORDER[number]);

  // Auto-suggest: if all scanned, suggest moving to QC
  const allScanned = run.individualTagging && run.unitsProduced >= run.quantity && run.quantity > 0;
  const suggestQC = allScanned && run.status === "IN_PRODUCTION";

  function handleStatusClick(newStatus: string) {
    if (!allowedStatuses.includes(newStatus) || newStatus === run.status) return;
    setConfirmStatus(newStatus);
  }

  function confirmStatusChange() {
    if (!confirmStatus) return;
    const newStatus = confirmStatus;
    setConfirmStatus(null);
    startTransition(async () => {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "IN_PRODUCTION" && !run.startDate) {
        updateData.startDate = new Date().toISOString();
      }
      if (newStatus === "COMPLETED") {
        updateData.actualCompletion = new Date().toISOString();
      }
      await updateProductionRun(run.id, updateData);
      router.refresh();
    });
  }

  const isMovingBackward = confirmStatus
    ? RUN_STATUS_ORDER.indexOf(confirmStatus as typeof RUN_STATUS_ORDER[number]) < currentIdx
    : false;

  function handleGenerateBatchTag(type: "qr" | "nfc") {
    startTransition(async () => {
      await generateBatchTag(run.id, type);
      setShowBatchGenerate(false);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/production-runs" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">{run.runCode}</h1>
            <StatusBadge display={RUN_STATUS_DISPLAY[run.status] || RUN_STATUS_DISPLAY.PLANNED} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {run.orderLine ? `${run.orderLine.order?.orderRef} · ${run.orderLine.product}` : "No order linked"}
            {run.supplier ? ` · ${run.supplier.name}` : ""}
          </p>
        </div>
        {run.status === "PLANNED" && (
          <button
            onClick={() => {
              if (confirm("Delete this planned production run?")) {
                startTransition(async () => {
                  const { deleteProductionRun } = await import("@/lib/actions/production-runs");
                  const result = await deleteProductionRun(run.id);
                  if (result.success) {
                    router.push("/production-runs");
                  } else {
                    alert(result.error ?? "Failed to delete run");
                  }
                });
              }
            }}
            disabled={isPending}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            Delete Run
          </button>
        )}
      </div>

      {/* Status Pipeline — the key UI */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Status Pipeline</h3>

        {/* Goods receipt banner — admin sees this when run is SHIPPED */}
        {run.status === "SHIPPED" && role === "ADMIN" && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-badge-sky-bg/50 border border-badge-sky-text/20 mb-4">
            <span className="text-[11px] font-medium text-badge-sky-text">
              This run has been shipped by the supplier. Ready to confirm receipt?
            </span>
            <Link
              href={`/production-runs/${run.id}/receive`}
              className="px-3 py-1 rounded-lg bg-badge-sky-text text-white text-[10px] font-bold uppercase tracking-wider"
            >
              Receive Goods
            </Link>
          </div>
        )}

        {/* QC suggestion banner */}
        {suggestQC && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-badge-purple-bg/50 border border-badge-purple-text/20 mb-4">
            <span className="text-[11px] font-medium text-badge-purple-text">
              All {run.quantity} garments scanned — ready to move to QC?
            </span>
            <button
              onClick={() => handleStatusClick("QC")}
              disabled={isPending}
              className="px-3 py-1 rounded-lg bg-badge-purple-text text-white text-[10px] font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Move to QC
            </button>
          </div>
        )}

        {/* Pipeline steps */}
        <div className="flex items-center gap-0 overflow-x-auto scrollbar-none">
          {RUN_STATUS_ORDER.map((status, i) => {
            const display = RUN_STATUS_DISPLAY[status];
            const isCurrent = run.status === status;
            const isPast = i < currentIdx;
            const canSet = allowedStatuses.includes(status);
            const isAdminOnly = isAdminOnlyStatus(status);

            return (
              <div key={status} className="flex items-center">
                {i > 0 && (
                  <div className={`w-4 sm:w-8 h-0.5 shrink-0 ${isPast ? "bg-badge-green-text" : "bg-border"}`} />
                )}
                <button
                  onClick={() => canSet && !isCurrent ? handleStatusClick(status) : undefined}
                  disabled={isPending || !canSet || isCurrent}
                  className={`relative flex flex-col items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl transition-all shrink-0 ${
                    isCurrent
                      ? "bg-foreground text-background scale-105"
                      : isPast
                        ? "bg-badge-green-bg text-badge-green-text cursor-pointer hover:scale-105"
                        : canSet
                          ? "bg-secondary/50 text-foreground cursor-pointer hover:bg-secondary hover:scale-105"
                          : "bg-muted/30 text-muted-foreground/40"
                  }`}
                >
                  {/* Step indicator */}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isCurrent ? "bg-background text-foreground" :
                    isPast ? "bg-badge-green-text text-white" :
                    "bg-muted"
                  }`}>
                    {isPast ? <Check size={12} /> : isAdminOnly && role !== "ADMIN" ? <Lock size={10} /> : i + 1}
                  </div>
                  <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {display?.label || status}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        {role !== "ADMIN" && (
          <p className="text-[9px] text-muted-foreground mt-3">
            You can advance the run up to &quot;Shipped&quot;. Admin will confirm receipt and completion.
          </p>
        )}

        {/* Confirm dialog */}
        {confirmStatus && (
          <div className="mt-4 p-4 rounded-xl border-2 border-foreground/20 bg-secondary/50">
            <p className="text-[12px] font-semibold text-foreground mb-1">
              {isMovingBackward ? "Revert status?" : "Confirm status change"}
            </p>
            <p className="text-[11px] text-muted-foreground mb-3">
              {isMovingBackward
                ? `Move this run back to "${RUN_STATUS_DISPLAY[confirmStatus]?.label}"? This will revert progress.`
                : `Move this run to "${RUN_STATUS_DISPLAY[confirmStatus]?.label}"?`
              }
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={confirmStatusChange}
                disabled={isPending}
                className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50 ${
                  isMovingBackward ? "bg-badge-orange-text" : "bg-foreground"
                }`}
              >
                {isPending ? "Updating..." : isMovingBackward ? "Yes, Revert" : "Confirm"}
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
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Quantity</p>
          <p className="text-[22px] font-bold tabular-nums">{run.quantity}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Produced</p>
          <p className="text-[22px] font-bold tabular-nums">{run.unitsProduced}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Garments</p>
          <p className="text-[22px] font-bold tabular-nums">{run._count.garments}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tagged</p>
          <p className="text-[22px] font-bold tabular-nums text-badge-green-text">{taggedCount}</p>
        </div>
      </div>

      {/* ── Scanning ─────────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border-2 p-5 mb-6 transition-colors ${
        run.status === "IN_PRODUCTION"
          ? "bg-card border-foreground/20"
          : "bg-muted/30 border-border"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
            run.status === "IN_PRODUCTION" ? "text-foreground" : "text-muted-foreground"
          }`}>
            Scanning
          </h3>
          {run.status !== "IN_PRODUCTION" && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Info size={11} />
              {run.status === "PLANNED" ? "Set status to In Production to unlock" : "Scanning complete"}
            </div>
          )}
        </div>

        {/* Batch scanning — primary */}
        <div className={`rounded-xl p-4 mb-3 border ${
          run.status === "IN_PRODUCTION"
            ? "bg-foreground text-background border-transparent"
            : "bg-muted/50 border-border"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package size={20} className={run.status === "IN_PRODUCTION" ? "text-background" : "text-muted-foreground/40"} strokeWidth={1.5} />
              <div>
                <p className={`text-[13px] font-bold ${run.status === "IN_PRODUCTION" ? "text-background" : "text-muted-foreground/50"}`}>
                  Batch Scan
                </p>
                <p className={`text-[11px] ${run.status === "IN_PRODUCTION" ? "text-background/70" : "text-muted-foreground/40"}`}>
                  Generate one QR / NFC tag for the entire run
                </p>
              </div>
            </div>
            {run.status === "IN_PRODUCTION" ? (
              <button
                onClick={() => setShowBatchGenerate(true)}
                className="px-4 py-2 rounded-lg bg-background text-foreground text-[11px] font-bold uppercase tracking-wider"
              >
                Generate
              </button>
            ) : (
              <span className="px-4 py-2 rounded-lg bg-muted/40 text-muted-foreground/40 text-[11px] font-bold uppercase tracking-wider">
                Locked
              </span>
            )}
          </div>

          {/* Show existing batch codes */}
          {run.status === "IN_PRODUCTION" && (run.batchQrCode || run.batchNfcTag) && (
            <div className="mt-3 pt-3 border-t border-background/20 flex items-center gap-4">
              {run.batchQrCode && (
                <div className="text-[10px] text-background/70">
                  <span className="font-bold text-background">QR</span> {run.batchQrCode.slice(0, 20)}…
                </div>
              )}
              {run.batchNfcTag && (
                <div className="text-[10px] text-background/70">
                  <span className="font-bold text-background">NFC</span> {run.batchNfcTag.slice(0, 20)}…
                </div>
              )}
            </div>
          )}
        </div>

        {/* Individual scanning — secondary */}
        <div className={`rounded-xl p-4 border ${
          run.status === "IN_PRODUCTION" ? "bg-card border-border" : "bg-muted/20 border-border/50"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScanLine size={20} className={run.status === "IN_PRODUCTION" ? "text-foreground" : "text-muted-foreground/40"} strokeWidth={1.5} />
              <div>
                <p className={`text-[13px] font-bold ${run.status === "IN_PRODUCTION" ? "text-foreground" : "text-muted-foreground/40"}`}>
                  Scan Individual Garments
                </p>
                <p className={`text-[11px] ${run.status === "IN_PRODUCTION" ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                  Tag each garment one by one · {run.unitsProduced}/{run.quantity} scanned
                </p>
              </div>
            </div>
            {run.status === "IN_PRODUCTION" ? (
              <Link
                href={`/production-runs/${run.id}/scan`}
                className="px-4 py-2 rounded-lg border border-border text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-secondary transition-colors"
              >
                Open
              </Link>
            ) : (
              <span className="px-4 py-2 rounded-lg bg-muted/40 text-muted-foreground/40 text-[11px] font-bold uppercase tracking-wider">
                Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Product info */}
      {(run.sku || run.productName || run.sizeBreakdown.length > 0) && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Product</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Product</p>
              <p className="text-[12px] text-foreground">{run.productName || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Colour</p>
              <p className="text-[12px] text-foreground">{run.productColor || "—"}</p>
            </div>
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Order</p>
              <p className="text-[12px] text-foreground">{run.order?.orderRef || run.orderLine?.order?.orderRef || "—"}</p>
            </div>
          </div>

          {/* Size breakdown table */}
          {run.sizeBreakdown.length > 0 ? (
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">Size Breakdown</p>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-secondary/30">
                    <tr>
                      <th className="text-left px-3 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Size</th>
                      <th className="text-left px-3 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">SKU</th>
                      <th className="text-right px-3 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Ordered</th>
                      <th className="text-right px-3 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Produced</th>
                      <th className="px-3 py-2 text-[9px]">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {run.sizeBreakdown.map((sb) => (
                      <tr key={sb.id}>
                        <td className="px-3 py-2 font-semibold text-foreground">{sb.size}</td>
                        <td className="px-3 py-2 font-mono-brand text-muted-foreground">{sb.sku || "—"}</td>
                        <td className="px-3 py-2 font-mono-brand text-foreground text-right tabular-nums">{sb.quantity}</td>
                        <td className="px-3 py-2 font-mono-brand text-foreground text-right tabular-nums">{sb.produced}</td>
                        <td className="px-3 py-2">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sb.quantity > 0 ? (sb.produced / sb.quantity) * 100 : 0}%`, backgroundColor: "hsl(142 76% 36%)" }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/20 font-bold">
                      <td className="px-3 py-2 text-foreground">Total</td>
                      <td className="px-3 py-2"></td>
                      <td className="px-3 py-2 font-mono-brand text-foreground text-right tabular-nums">{run.sizeBreakdown.reduce((s, sb) => s + sb.quantity, 0)}</td>
                      <td className="px-3 py-2 font-mono-brand text-foreground text-right tabular-nums">{run.sizeBreakdown.reduce((s, sb) => s + sb.produced, 0)}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : run.productSize ? (
            <div>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Size</p>
              <p className="text-[12px] text-foreground">{run.productSize}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Scanning & Tagging */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Scanning & Tagging</h3>
          <Badge
            label={run.individualTagging ? "Individual Tagging" : "Bulk Mode"}
            bgClass={run.individualTagging ? "bg-badge-purple-bg" : "bg-badge-blue-bg"}
            textClass={run.individualTagging ? "text-badge-purple-text" : "text-badge-blue-text"}
          />
        </div>

        {/* Tally + progress */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">
              {run.individualTagging ? "Garments Scanned" : "Units Produced"}
            </p>
            <p className="text-[28px] font-bold tabular-nums leading-none" style={{ color: "hsl(142 76% 36%)" }}>
              {run.unitsProduced}<span className="text-[16px] text-muted-foreground">/{run.quantity}</span>
            </p>
          </div>
          <div className="flex-1">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${run.quantity > 0 ? (run.unitsProduced / run.quantity) * 100 : 0}%`,
                  backgroundColor: "hsl(142 76% 36%)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Scan button — only available once IN_PRODUCTION */}
        <div className="flex items-center gap-3 mb-4">
          {["IN_PRODUCTION", "QC", "READY_TO_SHIP", "SHIPPED"].includes(run.status) ? (
            <Link
              href={`/production-runs/${run.id}/scan`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02]"
              style={{ backgroundColor: "hsl(25 95% 53%)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Start Scanning
            </Link>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Scanning available once the run is moved to <span className="font-semibold text-foreground">In Production</span>.
            </p>
          )}
        </div>

        {/* Batch tags (bulk mode) */}
        {!run.individualTagging && (
          <div className="border-t border-border pt-4">
            <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-3">Batch Tags</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-secondary/30 rounded-lg p-4">
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Batch QR Code</p>
                {run.batchQrCode ? (
                  <>
                    <p className="text-[11px] font-mono-brand text-foreground mb-2 break-all">{run.batchQrCode}</p>
                    <img src={`/api/qr/generate?data=${encodeURIComponent(run.batchQrCode)}`} alt="Batch QR" className="w-24 h-24 bg-white rounded-lg p-1" />
                  </>
                ) : (
                  <button
                    onClick={() => handleGenerateBatchTag("qr")}
                    disabled={isPending}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50"
                  >
                    Generate QR Code
                  </button>
                )}
              </div>
              <div className="bg-secondary/30 rounded-lg p-4">
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Batch NFC Tag</p>
                {run.batchNfcTag ? (
                  <p className="text-[11px] font-mono-brand text-foreground break-all">{run.batchNfcTag}</p>
                ) : (
                  <button
                    onClick={() => handleGenerateBatchTag("nfc")}
                    disabled={isPending}
                    className="text-[10px] text-primary hover:underline disabled:opacity-50"
                  >
                    Generate NFC Tag
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manufacturing Config */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Manufacturing Configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Washing Program", value: run.washingProgram },
            { label: "Temperature", value: run.washingTemperature != null ? `${run.washingTemperature}°C` : null },
            { label: "Finishing", value: run.finishingProcess },
            { label: "Machine Gauge", value: run.machineGauge },
            { label: "Knitwear Ply", value: run.knitwearPly },
            { label: "Finisher", value: run.finisherName },
            { label: "Finished Date", value: formatDate(run.finishedDate) },
            { label: "Supplier", value: run.supplier?.name },
            { label: "Start Date", value: formatDate(run.startDate) },
            { label: "Expected", value: formatDate(run.expectedCompletion) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <p className="text-[12px] text-foreground">{value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Yarn composition */}
      {run.yarnCompositions.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">Yarn Composition</h3>
          <div className="space-y-2">
            {run.yarnCompositions.map((y) => (
              <div key={y.id} className="flex items-center gap-3">
                <span className="text-[12px] text-foreground flex-1">{y.yarnType}</span>
                <div className="w-32 h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${y.percentage}%`, backgroundColor: "hsl(271 76% 53%)" }} />
                </div>
                <span className="text-[12px] font-mono-brand font-bold tabular-nums w-12 text-right">{y.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Garments in this run */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">
          Garments ({run._count.garments})
        </h3>
        {run.garments.length > 0 ? (
          <div className="space-y-1">
            {run.garments.map((g) => (
              <Link
                key={g.id}
                href={`/garments/${g.id}`}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <span className="text-[12px] font-mono-brand text-foreground">{g.garmentCode}</span>
                {g.isTagged ? (
                  <Badge label="Tagged" bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
                ) : (
                  <Badge label="Untagged" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">No garments yet. Start scanning to add them.</p>
        )}
      </div>
      {role !== "ADMIN" && (
        <ContextualHelp
          pageId="run-detail"
          title="Run Details"
          steps={[
            { icon: "📊", text: "This page shows all info about one production run" },
            { icon: "⏩", text: "Tap a status step at the top to move the run forward" },
            { icon: "📱", text: "Tap 'Start Scanning' to scan garments into this run" },
            { icon: "📦", text: "When all garments are scanned, move to 'Ready to Ship'" },
          ]}
          tip="You can move a run backwards if you made a mistake — just tap the previous step."
        />
      )}
    </div>
  );
}
