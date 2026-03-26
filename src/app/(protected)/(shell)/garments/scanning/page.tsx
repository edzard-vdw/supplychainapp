"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Nfc, QrCode, Camera, CheckCircle, AlertTriangle, Keyboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ScanMode = "nfc" | "qr" | "manual";

export default function ScanningPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ScanMode>("qr");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check NFC support
  useEffect(() => {
    setNfcSupported("NDEFReader" in window);
  }, []);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startNfcScan() {
    if (!("NDEFReader" in window)) {
      setError("NFC is not supported on this device or browser. Use Chrome on Android.");
      return;
    }
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      const ndef = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; addEventListener: (event: string, handler: (e: { serialNumber: string }) => void) => void } }).NDEFReader();
      await ndef.scan();
      ndef.addEventListener("reading", (event: { serialNumber: string }) => {
        setResult(event.serialNumber);
        setScanning(false);
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "NFC scan failed");
      setScanning(false);
    }
  }

  async function startQrScan() {
    setError(null);
    setResult(null);
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Use BarcodeDetector if available, otherwise show camera
      if ("BarcodeDetector" in window) {
        const detector = new (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector({ formats: ["qr_code"] });
        const scanInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              clearInterval(scanInterval);
              setResult(barcodes[0].rawValue);
              setScanning(false);
              stream.getTracks().forEach((t) => t.stop());
            }
          }
        }, 250);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Camera access denied");
      setScanning(false);
    }
  }

  function stopScan() {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  return (
    <div className="px-6 py-8 max-w-[600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/garments" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-0.5">Garments</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Scanning</h1>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center bg-card border border-border rounded-xl p-1 mb-8">
        <button
          onClick={() => { setMode("qr"); stopScan(); setResult(null); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === "qr" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <QrCode size={16} /> QR Code
        </button>
        <button
          onClick={() => { setMode("nfc"); stopScan(); setResult(null); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === "nfc" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Nfc size={16} /> NFC Tag
        </button>
        <button
          onClick={() => { setMode("manual"); stopScan(); setResult(null); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mode === "manual" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Keyboard size={16} /> Manual
        </button>
      </div>

      {/* Scanning area */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        {mode === "qr" && (
          <div className="relative aspect-square bg-black flex items-center justify-center">
            {scanning ? (
              <>
                <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-white/50 rounded-2xl relative">
                    <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                    <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                  </div>
                </div>
                <button onClick={stopScan} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-[11px] font-semibold rounded-lg">
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startQrScan}
                className="flex flex-col items-center gap-3 text-white/60 hover:text-white transition-colors py-20"
              >
                <Camera size={40} />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Tap to scan QR code</span>
              </button>
            )}
          </div>
        )}

        {mode === "nfc" && (
          <div className="flex flex-col items-center justify-center py-20 px-6">
            {!nfcSupported && (
              <div className="flex items-center gap-2 text-badge-orange-text bg-badge-orange-bg px-4 py-2 rounded-lg mb-6">
                <AlertTriangle size={14} />
                <span className="text-[11px] font-medium">NFC requires Chrome on Android</span>
              </div>
            )}
            {scanning ? (
              <>
                <div className="w-24 h-24 rounded-full border-4 border-foreground/20 border-t-foreground animate-spin mb-6" />
                <p className="text-[14px] font-semibold text-foreground mb-2">Waiting for NFC tag...</p>
                <p className="text-[11px] text-muted-foreground mb-4">Hold your device near the garment tag</p>
                <button onClick={stopScan} className="px-4 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              </>
            ) : (
              <button
                onClick={startNfcScan}
                disabled={!nfcSupported}
                className="flex flex-col items-center gap-3 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
              >
                <Nfc size={40} />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Tap to scan NFC tag</span>
              </button>
            )}
          </div>
        )}
      </div>

        {mode === "manual" && (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Keyboard size={32} className="text-muted-foreground mb-4" />
            <p className="text-[13px] font-semibold text-foreground mb-1">Manual Tag Entry</p>
            <p className="text-[11px] text-muted-foreground mb-6">Type or paste a tag ID, QR value, or NFC serial number</p>
            <div className="w-full max-w-xs space-y-3">
              <input
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && manualInput.trim()) { setResult(manualInput.trim()); setManualInput(""); } }}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-[13px] font-mono-brand text-foreground text-center outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter tag ID..."
                autoFocus
              />
              <button
                onClick={() => { if (manualInput.trim()) { setResult(manualInput.trim()); setManualInput(""); } }}
                disabled={!manualInput.trim()}
                className="w-full py-3 rounded-lg bg-foreground text-background text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 transition-colors"
              >
                Look Up
              </button>
            </div>
          </div>
        )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-badge-red-bg text-badge-red-text px-4 py-3 rounded-xl mb-4">
          <AlertTriangle size={14} />
          <span className="text-[11px] font-medium">{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-badge-green-text" />
            <span className="text-[12px] font-bold uppercase tracking-wider text-foreground">Scan Result</span>
          </div>
          <div className="bg-secondary/50 rounded-lg px-4 py-3 mb-4">
            <p className="text-[13px] font-mono-brand text-foreground break-all">{result}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge label={mode === "nfc" ? "NFC" : "QR"} bgClass="bg-badge-purple-bg" textClass="text-badge-purple-text" />
            <span className="text-[10px] text-muted-foreground">Scanned just now</span>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => { setResult(null); }}
              className="flex-1 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
