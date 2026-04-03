"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CheckCircle, XCircle, Nfc, QrCode, Camera, Keyboard, AlertTriangle, ArrowRight, Package, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RUN_STATUS_DISPLAY, formatDate } from "@/types/supply-chain";
import { lookupGarment, registerGarmentToRun } from "@/lib/actions/garments";
import { t } from "@/lib/i18n";

type RecentGarment = {
  id: number;
  garmentCode: string;
  isTagged: boolean;
  createdAt: string;
  color: { name: string; hexValue: string | null } | null;
  productionRun: {
    id: number;
    runCode: string;
    status: string;
    productName: string | null;
    supplier: { name: string } | null;
    orderLine: { product: string; order: { orderRef: string } } | null;
  } | null;
};

type RunOption = {
  id: number;
  runCode: string;
  productName: string | null;
  quantity: number;
  unitsProduced: number;
  status: string;
};

type LookupResult = {
  found: boolean;
  garment?: {
    id: number;
    garmentCode: string;
    product: string | null;
    size: string | null;
    nfcTagId: string | null;
    qrCode: string | null;
    isTagged: boolean;
    taggedAt: string | null;
    createdAt: string;
    color: { name: string; hexValue: string | null } | null;
    productionRun: {
      runCode: string;
      status: string;
      supplier: { id: number; name: string; country: string | null } | null;
      orderLine: { product: string; order: { orderRef: string; client: string | null } } | null;
    } | null;
    scanEvents: { id: number; scanType: string; createdAt: string }[];
  };
  searchCode: string;
};

export function GarmentCheckerClient({
  recentGarments,
  productionRuns,
  isAdmin,
  language = "en",
}: {
  recentGarments: RecentGarment[];
  productionRuns: RunOption[];
  isAdmin: boolean;
  language?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchCode, setSearchCode] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [scanMode, setScanMode] = useState<"manual" | "qr" | "nfc">("manual");
  const [nfcSupported, setNfcSupported] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Register form
  const [showRegister, setShowRegister] = useState(false);
  const [registerRunId, setRegisterRunId] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setNfcSupported("NDEFReader" in window);
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); };
  }, []);

  function handleLookup(code?: string) {
    const lookupCode = code || searchCode.trim();
    if (!lookupCode) return;
    startTransition(async () => {
      const garment = await lookupGarment(lookupCode);
      setResult({
        found: !!garment,
        garment: garment ? JSON.parse(JSON.stringify(garment)) : undefined,
        searchCode: lookupCode,
      });
      setShowRegister(false);
      setRegisterError(null);
      // Stop scanning if active
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
      setScanning(false);
    });
  }

  function handleRegister() {
    if (!registerRunId || !result?.searchCode) return;
    startTransition(async () => {
      const res = await registerGarmentToRun({
        code: result.searchCode,
        productionRunId: registerRunId,
        isNfc: scanMode === "nfc",
      });
      if (res.success) {
        // Re-lookup to show the now-registered garment
        handleLookup(result.searchCode);
        router.refresh();
      } else {
        setRegisterError(res.error || "Registration failed");
      }
    });
  }

  // QR camera scan
  function startQrScan() {
    setScanning(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        if ("BarcodeDetector" in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code"] });
          const interval = setInterval(async () => {
            if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
              try {
                const barcodes = await detector.detect(videoRef.current!);
                if (barcodes.length > 0) {
                  clearInterval(interval);
                  setSearchCode(barcodes[0].rawValue);
                  handleLookup(barcodes[0].rawValue);
                }
              } catch { /* ignore */ }
            }
          }, 300);
        }
      })
      .catch(() => { setScanning(false); });
  }

  // NFC scan
  function startNfcScan() {
    if (!("NDEFReader" in window)) return;
    setScanning(true);
    const ndef = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (event: string, handler: (e: { serialNumber: string }) => void) => void } }).NDEFReader();
    ndef.scan();
    ndef.addEventListener("reading", (event: { serialNumber: string }) => {
      setSearchCode(event.serialNumber);
      handleLookup(event.serialNumber);
      setScanning(false);
    });
  }

  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{t("nav.garments", language)}</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">{t("garment.checker.title", language)}</h1>
        <p className="text-[11px] text-muted-foreground mt-1">{t("garment.checker.subtitle", language)}</p>
      </div>

      {/* Scan mode toggle */}
      <div className="flex items-center bg-card border border-border rounded-xl p-1 mb-6">
        <button onClick={() => { setScanMode("manual"); setScanning(false); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${scanMode === "manual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          <Keyboard size={14} /> {t("garment.checker.type_code", language)}
        </button>
        <button onClick={() => { setScanMode("qr"); setResult(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${scanMode === "qr" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          <QrCode size={14} /> {t("garment.checker.qr_scan", language)}
        </button>
        <button onClick={() => { setScanMode("nfc"); setResult(null); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${scanMode === "nfc" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
          <Nfc size={14} /> NFC
        </button>
      </div>

      {/* Input area */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        {scanMode === "manual" && (
          <div className="p-5">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLookup(); }}
                placeholder={t("garment.checker.placeholder", language)}
                className="w-full pl-12 pr-24 py-4 bg-background border border-border rounded-xl text-[14px] font-mono-brand text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={() => handleLookup()}
                disabled={isPending || !searchCode.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
              >
                {isPending ? "..." : t("garment.checker.check", language)}
              </button>
            </div>
          </div>
        )}

        {scanMode === "qr" && (
          <div className="relative aspect-[16/9] bg-black flex items-center justify-center">
            {scanning ? (
              <>
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-white/40 rounded-2xl relative">
                    <div className="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-2 border-l-2 border-white rounded-tl-lg" />
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-2 border-r-2 border-white rounded-tr-lg" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-2 border-l-2 border-white rounded-bl-lg" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-2 border-r-2 border-white rounded-br-lg" />
                  </div>
                </div>
                <p className="absolute bottom-3 left-0 right-0 text-center text-white/50 text-[10px]">{t("garment.checker.point_qr", language)}</p>
              </>
            ) : (
              <button onClick={startQrScan} className="flex flex-col items-center gap-3 text-white/50 hover:text-white transition-colors py-12">
                <Camera size={36} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t("garment.checker.tap_qr", language)}</span>
              </button>
            )}
          </div>
        )}

        {scanMode === "nfc" && (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            {!nfcSupported && (
              <div className="flex items-center gap-2 text-badge-orange-text bg-badge-orange-bg px-4 py-2 rounded-lg mb-4">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-medium">{t("garment.checker.nfc_required", language)}</span>
              </div>
            )}
            {scanning ? (
              <>
                <div className="w-20 h-20 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin mb-4" />
                <p className="text-[13px] font-semibold text-foreground">{t("garment.checker.waiting_nfc", language)}</p>
              </>
            ) : (
              <button onClick={startNfcScan} disabled={!nfcSupported} className="flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground disabled:opacity-30">
                <Nfc size={36} />
                <span className="text-[11px] font-semibold uppercase tracking-wider">{t("garment.checker.tap_nfc", language)}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border-2 overflow-hidden mb-6 ${result.found ? "border-badge-green-text/30 bg-badge-green-bg/10" : "border-badge-orange-text/30 bg-badge-orange-bg/10"}`}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center gap-3">
            {result.found ? (
              <CheckCircle size={20} className="text-badge-green-text shrink-0" />
            ) : (
              <XCircle size={20} className="text-badge-orange-text shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground">
                {result.found ? t("garment.checker.found", language) : t("garment.checker.not_registered", language)}
              </p>
              <p className="text-[11px] font-mono-brand text-muted-foreground">{result.searchCode}</p>
            </div>
            {result.found && (
              <Link href={`/garments/${result.garment!.id}`} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline">
                {t("garment.checker.full_details", language)} <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {/* Found: show trace */}
          {result.found && result.garment && (
            <div className="px-5 pb-5 space-y-4">
              {/* Garment info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.field_code", language)}</p>
                  <p className="text-[12px] font-mono-brand font-semibold text-foreground">{result.garment.garmentCode}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.field_product", language)}</p>
                  <p className="text-[12px] text-foreground">{result.garment.product || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.field_size", language)}</p>
                  <p className="text-[12px] text-foreground">{result.garment.size || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.field_tagged", language)}</p>
                  <p className="text-[12px] text-foreground">{result.garment.taggedAt ? formatDate(result.garment.taggedAt) : "—"}</p>
                </div>
              </div>

              {/* Production trace */}
              {result.garment.productionRun && (
                <div className="bg-card rounded-xl p-4 border border-border">
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">{t("garment.checker.trace", language)}</p>
                  <div className="flex items-center gap-2 text-[11px] flex-wrap">
                    {result.garment.productionRun.orderLine?.order && (
                      <>
                        <Badge label={result.garment.productionRun.orderLine.order.orderRef} bgClass="bg-badge-blue-bg" textClass="text-badge-blue-text" />
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge label={result.garment.productionRun.runCode} bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                    <span className="text-muted-foreground">→</span>
                    <span className="font-semibold text-foreground">{result.garment.garmentCode}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    <div>
                      <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.run_status", language)}</p>
                      <Badge
                        label={RUN_STATUS_DISPLAY[result.garment.productionRun.status]?.label || result.garment.productionRun.status}
                        bgClass={RUN_STATUS_DISPLAY[result.garment.productionRun.status]?.bgClass || "bg-badge-gray-bg"}
                        textClass={RUN_STATUS_DISPLAY[result.garment.productionRun.status]?.textClass || "text-badge-gray-text"}
                      />
                    </div>
                    {result.garment.productionRun.supplier && (
                      <div>
                        <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.supplier", language)}</p>
                        <p className="text-[11px] text-foreground">
                          {result.garment.productionRun.supplier.name}
                          {result.garment.productionRun.supplier.country && ` · ${result.garment.productionRun.supplier.country}`}
                        </p>
                      </div>
                    )}
                    {result.garment.productionRun.orderLine && (
                      <div>
                        <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">{t("garment.checker.client", language)}</p>
                        <p className="text-[11px] text-foreground">{result.garment.productionRun.orderLine.order.client || "—"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recent scans */}
              {result.garment.scanEvents.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{t("garment.checker.recent_scans", language)}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {result.garment.scanEvents.map((e) => (
                      <Badge key={e.id} label={`${e.scanType.replace("_", " ")} · ${formatDate(e.createdAt)}`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Not found: offer to register */}
          {!result.found && (
            <div className="px-5 pb-5">
              <p className="text-[11px] text-muted-foreground mb-4">
                {t("garment.checker.unregistered", language)}
              </p>
              {!showRegister ? (
                <button
                  onClick={() => setShowRegister(true)}
                  className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider"
                >
                  {t("garment.checker.register_btn", language)}
                </button>
              ) : (
                <div className="bg-card rounded-xl p-4 border border-border space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">{t("garment.checker.select_run", language)}</label>
                    <select
                      value={registerRunId ?? ""}
                      onChange={(e) => setRegisterRunId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">{t("garment.checker.choose_run", language)}</option>
                      {productionRuns.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.runCode} — {r.productName || "Unknown"} ({r.unitsProduced}/{r.quantity}) [{RUN_STATUS_DISPLAY[r.status]?.label || r.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                  {registerError && (
                    <p className="text-[11px] text-badge-red-text">{registerError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleRegister}
                      disabled={isPending || !registerRunId}
                      className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
                    >
                      {isPending ? t("garment.checker.registering", language) : t("garment.checker.register", language)}
                    </button>
                    <button onClick={() => setShowRegister(false)} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground">
                      {t("cta.cancel", language)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <Clock size={12} /> {t("garment.checker.recent", language)}
          </h3>
          <span className="text-[10px] font-mono-brand text-muted-foreground">{recentGarments.length}</span>
        </div>
        {recentGarments.length > 0 ? (
          <div className="divide-y divide-border max-h-[40vh] overflow-y-auto">
            {recentGarments.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSearchCode(g.garmentCode); handleLookup(g.garmentCode); }}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-secondary/30 transition-colors"
              >
                {g.color?.hexValue && (
                  <div className="w-3 h-3 rounded border border-border shrink-0" style={{ backgroundColor: g.color.hexValue }} />
                )}
                <span className="text-[11px] font-mono-brand text-foreground flex-1 truncate">{g.garmentCode}</span>
                {g.productionRun && (
                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{g.productionRun.runCode}</span>
                )}
                {g.isTagged ? (
                  <Badge label={t("garment.checker.tagged", language)} bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
                ) : (
                  <Badge label={t("garment.checker.untagged", language)} bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Package size={20} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-[11px] text-muted-foreground">{t("garment.checker.no_garments", language)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
