"use client";

import { useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, AlertTriangle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateProductionRun } from "@/lib/actions/production-runs";

export default function ReceiveGoodsPage() {
  const params = useParams();
  const router = useRouter();
  const runId = parseInt(params.runId as string);
  const [isPending, startTransition] = useTransition();

  const [receivedQty, setReceivedQty] = useState(0);
  const [damagedQty, setDamagedQty] = useState(0);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  function handleConfirmReceipt() {
    startTransition(async () => {
      // Update run status to RECEIVED and record received quantities in notes
      const receiptNote = `Goods received: ${receivedQty} units (${damagedQty} damaged). ${notes}`.trim();
      await updateProductionRun(runId, {
        status: "RECEIVED",
        notes: receiptNote,
      });

      // Log the edit
      const { editWithLog } = await import("@/lib/actions/edit-log");
      await editWithLog({
        entityType: "production_run",
        entityId: runId,
        field: "status",
        newValue: "RECEIVED",
        note: receiptNote,
      });

      setConfirmed(true);
    });
  }

  if (confirmed) {
    return (
      <div className="px-6 py-16 max-w-[500px] mx-auto text-center">
        <CheckCircle size={48} className="mx-auto text-badge-green-text mb-4" />
        <h2 className="text-[20px] font-bold text-foreground mb-2">Goods Received</h2>
        <p className="text-[12px] text-muted-foreground mb-2">{receivedQty} units confirmed</p>
        {damagedQty > 0 && (
          <p className="text-[12px] text-badge-orange-text mb-2">{damagedQty} units flagged as damaged</p>
        )}
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={() => {
              startTransition(async () => {
                await updateProductionRun(runId, { status: "COMPLETED", actualCompletion: new Date().toISOString() });
                router.push(`/production-runs/${runId}`);
              });
            }}
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white disabled:opacity-50"
            style={{ backgroundColor: "hsl(142 76% 36%)" }}
          >
            Complete Run
          </button>
          <Link href={`/production-runs/${runId}`} className="px-5 py-2.5 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider">
            Back to Run
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-[600px] mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/production-runs/${runId}`} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">Goods Receipt</p>
          <h1 className="text-[18px] font-bold uppercase tracking-wide text-foreground">Confirm Delivery</h1>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
          <Package size={18} className="text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Verify the quantity and condition of goods received from the supplier.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Units Received *</label>
            <input type="number" value={receivedQty} onChange={(e) => setReceivedQty(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-[14px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" autoFocus />
          </div>
          <div>
            <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Damaged Units</label>
            <input type="number" value={damagedQty} onChange={(e) => setDamagedQty(parseInt(e.target.value) || 0)} className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-[14px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring text-right" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring resize-none" placeholder="Condition notes, any issues..." />
        </div>

        {damagedQty > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-badge-orange-bg/30">
            <AlertTriangle size={14} className="text-badge-orange-text" />
            <span className="text-[11px] text-badge-orange-text">{damagedQty} damaged unit{damagedQty !== 1 ? "s" : ""} will be flagged for review</span>
          </div>
        )}

        <button
          onClick={handleConfirmReceipt}
          disabled={isPending || receivedQty <= 0}
          className="w-full py-3 rounded-lg bg-foreground text-background text-[12px] font-bold uppercase tracking-wider disabled:opacity-40"
        >
          {isPending ? "Confirming..." : "Confirm Goods Received"}
        </button>
      </div>
    </div>
  );
}
