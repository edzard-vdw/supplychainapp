"use client";

import { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, QrCode, Nfc, Camera, CheckCircle, AlertTriangle, Keyboard, PartyPopper, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { scanGarmentIntoRun } from "@/lib/actions/production-runs";
import { t } from "@/lib/i18n";

type ScanStep = "qr" | "nfc" | "saving";
type InputMode = "camera" | "manual";
type ScanEntry = { garmentCode: string; tally: string; garmentNumber: number; total: number; time: string; size?: string };

export default function RunScanPage() {
  const params = useParams();
  const runId = parseInt(params.runId as string);
  const [isPending, startTransition] = useTransition();

  // Size selection for multi-size runs
  type SizeOption = { id: number; size: string; quantity: number; produced: number };
  const [sizes, setSizes] = useState<SizeOption[]>([]);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);

  const [scanStep, setScanStep] = useState<ScanStep>("qr");
  const [capturedQR, setCapturedQR] = useState<string | null>(null);
  const [capturedNFC, setCapturedNFC] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [nfcListening, setNfcListening] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [scanHistory, setScanHistory] = useState<ScanEntry[]>([]);
  const [runCode, setRunCode] = useState("");
  const [finisherName, setFinisherName] = useState("");
  const [editingFinisher, setEditingFinisher] = useState(false);
  const [finisherDraft, setFinisherDraft] = useState("");
  const [language, setLanguage] = useState("en");

  // Load run sizes on mount
  useEffect(() => {
    fetch(`/api/auth/me`).then((r) => r.json()).then((res) => {
      if (res?.data?.language) setLanguage(res.data.language);
    }).catch(() => {});
    import("@/lib/actions/production-runs").then(({ getProductionRun }) => {
      getProductionRun(runId).then((run) => {
        if (run?.runCode) setRunCode(run.runCode);
        if (run?.finisherName) {
          setFinisherName(run.finisherName);
          setFinisherDraft(run.finisherName);
        }
        if (run?.sizeBreakdown && run.sizeBreakdown.length > 0) {
          setSizes(run.sizeBreakdown.map((sb) => ({ id: sb.id, size: sb.size, quantity: sb.quantity, produced: sb.produced })));
          // Auto-select first size with remaining capacity
          const first = run.sizeBreakdown.find((sb) => sb.produced < sb.quantity);
          if (first) setSelectedSizeId(first.id);
        }
      });
    });
  }, [runId]);
  const [lastStatus, setLastStatus] = useState<"idle" | "success" | "error">("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQrRef = useRef("");
  const lastQrTimeRef = useRef(0);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const latestTally = scanHistory[0] || null;

  useEffect(() => {
    setNfcSupported("NDEFReader" in window);
    return () => { stopCamera(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit both QR + NFC
  const submitDualScan = useCallback((qr: string, nfc: string) => {
    setLastError(null);
    setScanStep("saving");
    startTransition(async () => {
      const result = await scanGarmentIntoRun(runId, { qrCode: qr, nfcTagId: nfc, sizeBreakdownId: selectedSizeId || undefined });
      if (!result.success) {
        setLastStatus("error");
        setLastError(result.error || "Failed");
        setTimeout(() => { setLastStatus("idle"); setLastError(null); }, 3000);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setCapturedQR(null); setCapturedNFC(null); setScanStep("qr");
        return;
      }
      const entry: ScanEntry = {
        garmentCode: result.data!.garment.garmentCode, tally: result.data!.tally,
        garmentNumber: result.data!.garmentNumber, total: result.data!.total,
        time: new Date().toLocaleTimeString(),
        size: result.data!.size,
      };
      // Update local size counts
      if (result.data!.sizeBreakdownId) {
        setSizes((prev) => prev.map((s) => s.id === result.data!.sizeBreakdownId ? { ...s, produced: s.produced + 1 } : s));
      }
      setScanHistory((prev) => [entry, ...prev]);
      setLastStatus("success");
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      if (result.data!.garmentNumber >= result.data!.total && result.data!.total > 0) {
        setIsComplete(true); return;
      }
      // Reset for next garment
      setTimeout(() => {
        setLastStatus("idle"); setCapturedQR(null); setCapturedNFC(null); setScanStep("qr");
      }, 800);
    });
  }, [runId, startTransition]);

  // ─── Camera ───
  function startCamera() {
    setCameraActive(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        if ("BarcodeDetector" in window) {
          const detector = new (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code"] });
          scanIntervalRef.current = setInterval(async () => {
            if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
              try {
                const b = await detector.detect(videoRef.current!);
                if (b.length > 0) {
                  const val = b[0].rawValue;
                  const now = Date.now();
                  if (val !== lastQrRef.current || now - lastQrTimeRef.current > 3000) {
                    lastQrRef.current = val; lastQrTimeRef.current = now;
                    onQRCaptured(val);
                  }
                }
              } catch { /* ignore */ }
            }
          }, 300);
        }
      })
      .catch(() => { setCameraActive(false); setLastError("Camera access denied"); });
  }

  function stopCamera() {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    setCameraActive(false);
  }

  function onQRCaptured(val: string) {
    setCapturedQR(val); setScanStep("nfc"); stopCamera();
    if (navigator.vibrate) navigator.vibrate(50);
    if (nfcSupported) startNFC();
  }

  // ─── NFC ───
  function startNFC() {
    if (!("NDEFReader" in window)) return;
    setNfcListening(true);
    try {
      const ndef = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (e: string, h: (ev: { serialNumber: string }) => void) => void } }).NDEFReader();
      ndef.scan();
      ndef.addEventListener("reading", (ev: { serialNumber: string }) => { onNFCCaptured(ev.serialNumber); });
    } catch { setNfcListening(false); setLastError("NFC failed"); }
  }

  function onNFCCaptured(val: string) {
    setCapturedNFC(val); setNfcListening(false);
    if (navigator.vibrate) navigator.vibrate(50);
    if (capturedQR) submitDualScan(capturedQR, val);
  }

  // ─── Manual ───
  function handleManualSubmit() {
    const val = manualInput.trim();
    if (!val) return;
    setManualInput("");
    if (scanStep === "qr") { setCapturedQR(val); setScanStep("nfc"); setTimeout(() => manualInputRef.current?.focus(), 100); }
    else if (scanStep === "nfc" && capturedQR) { setCapturedNFC(val); submitDualScan(capturedQR, val); }
  }

  const statusBorder = lastStatus === "success" ? "border-badge-green-text/40" : lastStatus === "error" ? "border-badge-red-text/40" : "border-border";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Link href={`/production-runs/${runId}`} className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">Scan Garment — Step {scanStep === "qr" ? "1" : "2"} of 2</p>
          <p className="text-[12px] font-bold text-foreground">{runCode || `Run #${runId}`}</p>
          {finisherName ? (
            editingFinisher ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  value={finisherDraft}
                  onChange={(e) => setFinisherDraft(e.target.value)}
                  className="flex-1 px-2 py-0.5 text-[10px] bg-secondary border border-border rounded text-foreground focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setFinisherName(finisherDraft);
                      setEditingFinisher(false);
                      import("@/lib/actions/production-runs").then(({ updateProductionRun }) => {
                        updateProductionRun(runId, { finisherName: finisherDraft });
                      });
                    }
                    if (e.key === "Escape") setEditingFinisher(false);
                  }}
                  autoFocus
                />
                <button onClick={() => { setFinisherName(finisherDraft); setEditingFinisher(false); import("@/lib/actions/production-runs").then(({ updateProductionRun }) => { updateProductionRun(runId, { finisherName: finisherDraft }); }); }} className="text-[9px] text-badge-green-text font-bold">✓</button>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t("scan.finisher_set", language)} <span className="font-semibold text-foreground">{finisherName}</span>
                <button onClick={() => { setFinisherDraft(finisherName); setEditingFinisher(true); }} className="ml-1.5 text-[9px] text-muted-foreground hover:text-foreground underline">{t("scan.finisher_edit", language)}</button>
              </p>
            )
          ) : (
            <p className="text-[10px] text-badge-orange-text font-medium mt-0.5">{t("scan.no_finisher", language)}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${scanStep === "qr" ? "bg-foreground text-background" : capturedQR ? "bg-badge-green-text text-white" : "bg-muted text-muted-foreground"}`}>
            {capturedQR ? <CheckCircle size={12} /> : "1"}
          </div>
          <ArrowRight size={10} className="text-muted-foreground" />
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${scanStep === "nfc" ? "bg-foreground text-background" : capturedNFC ? "bg-badge-green-text text-white" : "bg-muted text-muted-foreground"}`}>
            {capturedNFC ? <CheckCircle size={12} /> : "2"}
          </div>
        </div>
      </div>

      {/* Completion */}
      {isComplete && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
          <PartyPopper size={48} className="text-badge-green-text mb-4" />
          <h2 className="text-[24px] font-bold text-foreground mb-2">Run Complete!</h2>
          <p className="text-[32px] font-bold font-mono-brand tabular-nums text-badge-green-text mb-6">{latestTally?.tally}</p>
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => { startTransition(async () => { const { updateProductionRun } = await import("@/lib/actions/production-runs"); await updateProductionRun(runId, { status: "QC" }); }); }} disabled={isPending} className="px-6 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider text-white disabled:opacity-50" style={{ backgroundColor: "hsl(271 76% 53%)" }}>Move to QC →</button>
            <Link href={`/production-runs/${runId}`} className="px-6 py-3 rounded-xl bg-foreground text-background text-[12px] font-bold uppercase tracking-wider">Back to Run</Link>
          </div>
        </div>
      )}

      {/* Tally */}
      <div className={`shrink-0 py-5 text-center border-b-2 transition-all duration-300 ${statusBorder}`}>
        {latestTally ? (
          <>
            <p className="text-[48px] font-bold tabular-nums leading-none" style={{ color: "hsl(142 76% 36%)" }}>
              {latestTally.garmentNumber}<span className="text-[24px] text-muted-foreground">/{latestTally.total}</span>
            </p>
            <div className="mt-2 mx-auto w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${latestTally.total > 0 ? (latestTally.garmentNumber / latestTally.total) * 100 : 0}%`, backgroundColor: "hsl(142 76% 36%)" }} />
            </div>
            {lastStatus === "success" && (
              <div className="mt-1.5 flex items-center justify-center gap-1.5">
                <CheckCircle size={12} className="text-badge-green-text" />
                <span className="text-[11px] font-mono-brand text-badge-green-text">{latestTally.garmentCode}</span>
              </div>
            )}
          </>
        ) : (
          <p className="text-[18px] font-bold text-muted-foreground">{t("scan.qr_ready", language)}</p>
        )}
      </div>

      {/* Error */}
      {lastError && (
        <div className="shrink-0 flex items-center gap-2 bg-badge-red-bg text-badge-red-text px-4 py-2.5">
          <AlertTriangle size={14} />
          <span className="text-[11px] font-medium flex-1">{lastError}</span>
        </div>
      )}

      {/* Size selector — only shows for multi-size runs */}
      {sizes.length > 1 && (
        <div className="shrink-0 px-4 py-2 bg-card border-b border-border">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1.5">Scanning Size</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {sizes.map((s) => {
              const isSelected = selectedSizeId === s.id;
              const isDone = s.produced >= s.quantity;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSizeId(s.id)}
                  disabled={isDone}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap shrink-0 ${
                    isSelected
                      ? "bg-foreground text-background"
                      : isDone
                        ? "bg-badge-green-bg text-badge-green-text line-through opacity-60"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {s.size.split(" - ")[0] || s.size}
                  <span className={`font-mono-brand text-[9px] ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                    {s.produced}/{s.quantity}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step instruction */}
      <div className="shrink-0 px-4 py-3 bg-secondary/30 border-b border-border">
        <div className="flex items-center gap-3">
          {scanStep === "qr" && (<><QrCode size={18} className="text-primary" /><div><p className="text-[12px] font-bold text-foreground">Step 1: Scan QR Code</p><p className="text-[10px] text-muted-foreground">Scan the QR on the Connected Dot (back)</p></div></>)}
          {scanStep === "nfc" && (<><Nfc size={18} className="text-primary" /><div><p className="text-[12px] font-bold text-foreground">Step 2: Tap NFC Tag</p><p className="text-[10px] text-muted-foreground">Hold device near the Connected Dot (front)</p></div>{capturedQR && <Badge label={`QR: ${capturedQR.slice(0, 15)}...`} bgClass="bg-badge-green-bg" textClass="text-badge-green-text" className="ml-auto" />}</>)}
          {scanStep === "saving" && (<><CheckCircle size={18} className="text-badge-green-text" /><p className="text-[12px] font-bold text-foreground">Saving garment...</p></>)}
        </div>
      </div>

      {/* Input mode */}
      <div className="flex items-center bg-card border-b border-border p-1 shrink-0">
        {(["camera", "manual"] as const).map((m) => {
          const Icon = m === "camera" ? Camera : Keyboard;
          return (
            <button key={m} onClick={() => { setInputMode(m); stopCamera(); setNfcListening(false); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${inputMode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              <Icon size={13} /> {m === "camera" ? "Camera + NFC" : "Manual"}
            </button>
          );
        })}
      </div>

      {/* Scan area */}
      <div className="flex-1 flex items-center justify-center">
        {/* Camera: Step 1 QR */}
        {inputMode === "camera" && scanStep === "qr" && (
          cameraActive ? (
            <div className="relative w-full h-full bg-black">
              <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-44 h-44 border-2 border-white/40 rounded-2xl relative">
                  <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                  <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                </div>
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/50 text-[10px]">Point at QR — auto-detects</p>
            </div>
          ) : (
            <button onClick={startCamera} className="flex flex-col items-center gap-4 text-muted-foreground hover:text-foreground">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-current flex items-center justify-center"><Camera size={32} /></div>
              <span className="text-[12px] font-semibold uppercase tracking-wider">Start Camera</span>
            </button>
          )
        )}

        {/* Camera: Step 2 NFC */}
        {inputMode === "camera" && scanStep === "nfc" && (
          <div className="flex flex-col items-center gap-4 px-6">
            {nfcSupported ? (
              nfcListening ? (
                <><div className="w-24 h-24 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin" /><p className="text-[14px] font-semibold text-foreground">Waiting for NFC tap...</p><p className="text-[11px] text-muted-foreground">Hold Connected Dot near device</p></>
              ) : (
                <button onClick={startNFC} className="flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground"><Nfc size={36} /><span className="text-[12px] font-semibold uppercase tracking-wider">Tap to listen for NFC</span></button>
              )
            ) : (
              <div className="text-center">
                <AlertTriangle size={24} className="mx-auto text-badge-orange-text mb-2" />
                <p className="text-[12px] font-semibold text-foreground mb-1">NFC not available on this browser</p>
                <p className="text-[10px] text-muted-foreground mb-4">Switch to Manual to type the NFC tag ID</p>
                <button onClick={() => setInputMode("manual")} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider">Switch to Manual</button>
              </div>
            )}
          </div>
        )}

        {/* Manual mode */}
        {inputMode === "manual" && (
          <div className="w-full max-w-sm px-6">
            <p className="text-[12px] font-bold text-foreground text-center mb-1">
              {scanStep === "qr" ? "Enter QR Code Value" : "Enter NFC Tag ID"}
            </p>
            <p className="text-[10px] text-muted-foreground text-center mb-4">
              {scanStep === "qr" ? "Step 1 of 2" : "Step 2 of 2"}
            </p>
            {capturedQR && scanStep === "nfc" && (
              <div className="flex items-center gap-2 px-3 py-2 bg-badge-green-bg/50 rounded-lg mb-3">
                <CheckCircle size={12} className="text-badge-green-text" />
                <span className="text-[10px] font-mono-brand text-badge-green-text truncate">QR: {capturedQR}</span>
              </div>
            )}
            <input ref={manualInputRef} value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleManualSubmit(); }} className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-xl text-[14px] font-mono-brand text-foreground text-center outline-none focus:ring-2 focus:ring-ring" placeholder={scanStep === "qr" ? "QR code value..." : "NFC tag ID..."} autoFocus disabled={isPending} />
            <button onClick={handleManualSubmit} disabled={!manualInput.trim() || isPending} className="w-full mt-3 py-3 rounded-xl bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40">
              {isPending ? "Saving..." : scanStep === "qr" ? "Next → NFC" : "Submit Both"}
            </button>
          </div>
        )}

        {/* Saving state */}
        {scanStep === "saving" && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <p className="text-[12px] text-muted-foreground">Linking garment...</p>
          </div>
        )}
      </div>

      {/* History */}
      {scanHistory.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card max-h-28 overflow-y-auto">
          {scanHistory.slice(0, 5).map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-1.5 border-b border-border last:border-0">
              <CheckCircle size={10} className="text-badge-green-text shrink-0" />
              <span className="text-[10px] font-mono-brand text-foreground flex-1 truncate">{s.garmentCode}</span>
              <Badge label={s.tally} bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
              <span className="text-[9px] text-muted-foreground">{s.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
