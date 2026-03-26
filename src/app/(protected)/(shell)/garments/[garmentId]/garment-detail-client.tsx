"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Nfc, QrCode, MapPin, Clock, ExternalLink, Scissors, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/types/supply-chain";
import { changeQrCode } from "@/lib/actions/garments";

type GarmentFull = {
  id: number;
  garmentCode: string;
  product: string | null;
  size: string | null;
  style: string | null;
  nfcTagId: string | null;
  qrCode: string | null;
  traceabilityUrl: string | null;
  isTagged: boolean;
  taggedAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationName: string | null;
  locationUpdatedAt: string | null;
  manufacturer: string | null;
  finisher: string | null;
  createdAt: string;
  color: { name: string; hexValue: string | null } | null;
  productionRun: {
    runCode: string;
    orderLine: { order: { orderRef: string } } | null;
  } | null;
  scanEvents: { id: number; scanType: string; tagData: string | null; createdAt: string }[];
  qrHistory: { id: number; oldQrCode: string | null; newQrCode: string; reason: string | null; createdAt: string }[];
};

export function GarmentDetailClient({ garment }: { garment: GarmentFull }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [showChangeQr, setShowChangeQr] = useState(false);
  const [newQr, setNewQr] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [showFinisher, setShowFinisher] = useState(false);
  const [finisherName, setFinisherName] = useState(garment.finisher || "");

  // Load QR code image
  useEffect(() => {
    const qrData = garment.traceabilityUrl || garment.qrCode;
    if (qrData) {
      fetch(`/api/qr/generate?data=${encodeURIComponent(qrData)}`)
        .then((r) => r.text())
        .then((svg) => setQrSvg(svg))
        .catch(() => {});
    }
  }, [garment.traceabilityUrl, garment.qrCode]);

  function handleChangeQr() {
    if (!newQr.trim()) return;
    startTransition(async () => {
      await changeQrCode(garment.id, newQr.trim(), changeReason || undefined);
      setShowChangeQr(false);
      setNewQr("");
      setChangeReason("");
      router.refresh();
    });
  }

  async function handleUpdateFinisher() {
    startTransition(async () => {
      const { updateGarmentFinisher } = await import("@/lib/actions/garments");
      await updateGarmentFinisher(garment.id, finisherName);
      setShowFinisher(false);
      router.refresh();
    });
  }

  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/garments" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">{garment.garmentCode}</h1>
          <p className="text-[10px] text-muted-foreground">
            {garment.product || "—"} · {garment.color?.name || "—"} · Size {garment.size || "—"}
          </p>
        </div>
        {garment.isTagged ? (
          <Badge label="Tagged" bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
        ) : (
          <Badge label="Untagged" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* QR Code Image */}
          {(garment.qrCode || garment.traceabilityUrl) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">QR Code</h3>
              <div className="flex items-start gap-5">
                {qrSvg ? (
                  <div
                    className="w-32 h-32 bg-white rounded-xl p-2 border border-border shrink-0"
                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-muted rounded-xl flex items-center justify-center">
                    <QrCode size={24} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">QR Value</p>
                    <p className="text-[11px] font-mono-brand text-foreground break-all">{garment.qrCode || "—"}</p>
                  </div>
                  {garment.traceabilityUrl && (
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Traceability URL</p>
                      <a href={garment.traceabilityUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline break-all">
                        {garment.traceabilityUrl}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={() => setShowChangeQr(!showChangeQr)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2"
                  >
                    <RefreshCw size={10} /> Change QR
                  </button>
                </div>
              </div>

              {/* Change QR form */}
              {showChangeQr && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <div>
                    <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">New QR Code *</label>
                    <input value={newQr} onChange={(e) => setNewQr(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="New QR value" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Reason</label>
                    <input value={changeReason} onChange={(e) => setChangeReason(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Optional reason" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleChangeQr} disabled={isPending || !newQr.trim()} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">
                      {isPending ? "Saving..." : "Update QR"}
                    </button>
                    <button onClick={() => setShowChangeQr(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tag info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Tag Information</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Nfc size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">NFC Tag ID</p>
                  <p className="text-[12px] font-mono-brand text-foreground">{garment.nfcTagId || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <QrCode size={16} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">QR Code</p>
                  <p className="text-[12px] font-mono-brand text-foreground">{garment.qrCode || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Production info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Production</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Run</p>
                <p className="text-[12px] text-foreground">{garment.productionRun?.runCode || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Order</p>
                <p className="text-[12px] text-foreground">{garment.productionRun?.orderLine?.order?.orderRef || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Manufacturer</p>
                <p className="text-[12px] text-foreground">{garment.manufacturer || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Finisher</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[12px] text-foreground">{garment.finisher || "—"}</p>
                  <button onClick={() => setShowFinisher(!showFinisher)} className="text-muted-foreground hover:text-foreground">
                    <Scissors size={10} />
                  </button>
                </div>
              </div>
            </div>

            {/* Finisher capture */}
            {showFinisher && (
              <div className="pt-3 border-t border-border space-y-2">
                <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Capture Finisher</label>
                <input
                  value={finisherName}
                  onChange={(e) => setFinisherName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Finisher name"
                />
                <div className="flex gap-2">
                  <button onClick={handleUpdateFinisher} disabled={isPending} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">
                    {isPending ? "Saving..." : "Save Finisher"}
                  </button>
                  <button onClick={() => setShowFinisher(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          {(garment.lastLatitude || garment.lastLongitude) && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <MapPin size={12} /> Location
              </h3>
              <p className="text-[11px] font-mono-brand text-muted-foreground">
                {garment.lastLatitude?.toFixed(4)}, {garment.lastLongitude?.toFixed(4)}
                {garment.lastLocationName && ` — ${garment.lastLocationName}`}
              </p>
              {garment.locationUpdatedAt && (
                <p className="text-[9px] text-muted-foreground">Updated: {formatDate(garment.locationUpdatedAt)}</p>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Clock size={12} /> Timeline
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Created</span>
                <span className="text-[10px] font-mono-brand text-foreground">{formatDate(garment.createdAt)}</span>
              </div>
              {garment.taggedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Tagged</span>
                  <span className="text-[10px] font-mono-brand text-foreground">{formatDate(garment.taggedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Scan history */}
          {garment.scanEvents.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Scan History</h3>
              <div className="space-y-2">
                {garment.scanEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <Badge
                      label={event.scanType.replace("_", " ")}
                      bgClass={event.scanType.includes("NFC") ? "bg-badge-purple-bg" : "bg-badge-blue-bg"}
                      textClass={event.scanType.includes("NFC") ? "text-badge-purple-text" : "text-badge-blue-text"}
                    />
                    <span className="text-[10px] font-mono-brand text-muted-foreground flex-1 truncate">
                      {event.tagData ? event.tagData.slice(0, 20) + "..." : "—"}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{formatDate(event.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR change history */}
          {garment.qrHistory.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">QR Change History</h3>
              <div className="space-y-2">
                {garment.qrHistory.map((change) => (
                  <div key={change.id} className="py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono-brand text-foreground">{change.oldQrCode || "—"} → {change.newQrCode}</span>
                      <span className="text-[9px] text-muted-foreground">{formatDate(change.createdAt)}</span>
                    </div>
                    {change.reason && <p className="text-[9px] text-muted-foreground italic mt-0.5">{change.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
