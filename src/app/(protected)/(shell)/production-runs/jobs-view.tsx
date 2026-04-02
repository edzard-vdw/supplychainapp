"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScanLine, ChevronRight, Clock, AlertCircle } from "lucide-react";
import { acceptJobAndCreateRun } from "@/lib/actions/orders";
import { RUN_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";

type PendingJob = {
  id: number;
  orderRef: string;
  client: string | null;
  dueDate: string | null;
  totalQuantity: number;
  orderLines: { product: string; size: string | null; quantity: number }[];
  _count: { orderLines: number };
};

type ActiveRun = {
  id: number;
  runCode: string;
  status: string;
  quantity: number;
  unitsProduced: number;
  productName: string | null;
  order: { orderRef: string; dueDate: string | null } | null;
  sizeBreakdown: { size: string; quantity: number; produced: number }[];
  _count: { garments: number };
};

const STATUS_ORDER = ["PLANNED", "IN_PRODUCTION", "QC", "READY_TO_SHIP", "SHIPPED"];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED:       { bg: "bg-muted/50",              text: "text-muted-foreground",   dot: "bg-muted-foreground" },
  IN_PRODUCTION: { bg: "bg-badge-blue-bg",          text: "text-badge-blue-text",    dot: "bg-badge-blue-text" },
  QC:            { bg: "bg-badge-purple-bg",        text: "text-badge-purple-text",  dot: "bg-badge-purple-text" },
  READY_TO_SHIP: { bg: "bg-badge-orange-bg",        text: "text-badge-orange-text",  dot: "bg-badge-orange-text" },
  SHIPPED:       { bg: "bg-badge-green-bg",         text: "text-badge-green-text",   dot: "bg-badge-green-text" },
};

function RunCard({ run }: { run: ActiveRun }) {
  const style = STATUS_STYLE[run.status] ?? STATUS_STYLE.PLANNED;
  const pct = run.quantity > 0 ? Math.round((run.unitsProduced / run.quantity) * 100) : 0;
  const canScan = run.status === "IN_PRODUCTION";
  const display = RUN_STATUS_DISPLAY[run.status];

  return (
    <Link
      href={`/production-runs/${run.id}`}
      className="block bg-card border border-border rounded-xl overflow-hidden hover:border-foreground/20 transition-colors"
    >
      <div className="px-5 py-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground">{run.runCode}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {run.order?.orderRef ?? "—"}
              {run.productName ? ` · ${run.productName}` : ""}
              {run.order?.dueDate ? ` · Due ${formatDate(run.order.dueDate)}` : ""}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {display?.label ?? run.status}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
            <span>{run.unitsProduced} / {run.quantity} units</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${canScan ? "bg-badge-blue-text" : "bg-muted-foreground/40"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Start Scanning CTA */}
        <div className="flex items-center justify-between">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
              canScan
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
            }`}
          >
            <ScanLine size={12} strokeWidth={2} />
            {canScan ? "Start Scanning" : "Start Scanning"}
          </div>
          {!canScan && run.status === "PLANNED" && (
            <span className="text-[10px] text-muted-foreground">Mark as In Production first</span>
          )}
          <ChevronRight size={14} className="text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

export function JobsView({ pendingJobs, activeRuns }: { pendingJobs: PendingJob[]; activeRuns: ActiveRun[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAccept(orderId: number) {
    setAcceptingId(orderId);
    setError(null);
    startTransition(async () => {
      const result = await acceptJobAndCreateRun(orderId);
      if (result.success && result.runId) {
        router.push(`/production-runs/${result.runId}`);
      } else {
        setError(result.error ?? "Failed to accept job");
        setAcceptingId(null);
      }
    });
  }

  // Group active runs by status for the pipeline display
  const runsByStatus = STATUS_ORDER.reduce<Record<string, ActiveRun[]>>((acc, s) => {
    acc[s] = activeRuns.filter((r) => r.status === s);
    return acc;
  }, {});

  const hasActiveRuns = activeRuns.length > 0;

  return (
    <div className="px-4 py-6 max-w-[700px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Production</p>
        <h1 className="text-[22px] font-bold uppercase tracking-wide text-foreground">Jobs</h1>
      </div>

      {/* ── NEW JOBS ── */}
      {pendingJobs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={14} className="text-badge-orange-text" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              New Jobs
            </h2>
            <span className="w-5 h-5 rounded-full bg-badge-orange-text text-white flex items-center justify-center text-[10px] font-bold">
              {pendingJobs.length}
            </span>
          </div>

          <div className="space-y-3">
            {pendingJobs.map((job) => {
              const isAccepting = acceptingId === job.id && isPending;
              // Summarise products
              const products = [...new Set(job.orderLines.map((l) => l.product))].slice(0, 2).join(", ");
              const sizes = [...new Set(job.orderLines.map((l) => l.size).filter(Boolean))].join(", ");

              return (
                <div
                  key={job.id}
                  className="bg-card border-2 border-badge-orange-text/30 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <p className="text-[15px] font-bold text-foreground">{job.orderRef}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {job.client ?? "—"}
                          {job.dueDate && (
                            <span className="text-badge-orange-text font-medium"> · Due {formatDate(job.dueDate)}</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[20px] font-bold tabular-nums text-foreground leading-tight">
                          {job.totalQuantity.toLocaleString()}
                        </p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">units</p>
                      </div>
                    </div>

                    {(products || sizes) && (
                      <p className="text-[11px] text-muted-foreground mb-4">
                        {products}{sizes ? ` · Sizes: ${sizes}` : ""}
                        {job._count.orderLines > 1 && ` · ${job._count.orderLines} lines`}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAccept(job.id)}
                        disabled={isPending}
                        className="flex-1 py-3 rounded-xl bg-foreground text-background text-[12px] font-bold uppercase tracking-wider disabled:opacity-50 transition-opacity active:scale-95"
                      >
                        {isAccepting ? "Accepting…" : "Accept Job →"}
                      </button>
                      <Link
                        href={`/orders/${job.id}/po-view`}
                        className="px-4 py-3 rounded-xl border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        View PO
                      </Link>
                    </div>

                    {error && acceptingId === job.id && (
                      <p className="text-[11px] text-destructive mt-2">{error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ACTIVE JOBS ── */}
      {hasActiveRuns && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-muted-foreground" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Active Jobs
            </h2>
            <span className="text-[10px] text-muted-foreground">({activeRuns.length})</span>
          </div>

          <div className="space-y-6">
            {STATUS_ORDER.map((status) => {
              const runs = runsByStatus[status];
              if (!runs || runs.length === 0) return null;
              const style = STATUS_STYLE[status];
              return (
                <div key={status}>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {RUN_STATUS_DISPLAY[status]?.label ?? status}
                    <span className="opacity-60">({runs.length})</span>
                  </div>
                  <div className="space-y-2">
                    {runs.map((run) => <RunCard key={run.id} run={run} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {pendingJobs.length === 0 && !hasActiveRuns && (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <p className="text-[14px] font-semibold text-foreground mb-1">No jobs yet</p>
          <p className="text-[12px] text-muted-foreground">New orders will appear here when assigned to you</p>
        </div>
      )}
    </div>
  );
}
