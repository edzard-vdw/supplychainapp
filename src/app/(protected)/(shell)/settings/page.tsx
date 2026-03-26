"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const [isPending, startTransition] = useTransition();
  const [baseUrl, setBaseUrl] = useState("https://api.sheepinc.com/api/production");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configResult, setConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSaveConfig() {
    startTransition(async () => {
      try {
        const { saveApiConfig, testConnection } = await import("@/lib/sync/sheep-api-client");
        await saveApiConfig({ baseUrl, email, password });
        const test = await testConnection();
        setConfigResult({
          success: test.success,
          message: test.success ? "Connected successfully" : test.error || "Connection failed",
        });
      } catch {
        setConfigResult({ success: false, message: "Failed to save config" });
      }
    });
  }

  async function handleFullSync() {
    setSyncResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync/pull", { method: "POST" });
        const data = await res.json();
        setSyncResult({
          success: data.success,
          message: data.success
            ? `Synced ${data.data?.totalPulled || 0} records`
            : data.error || "Sync failed",
        });
      } catch {
        setSyncResult({ success: false, message: "Sync request failed" });
      }
    });
  }

  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Configuration</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* API Config */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Legacy API Connection</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Connect to api.sheepinc.com to sync orders, materials, production runs, and garments.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">API Base URL</label>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="your@email.com" />
            </div>
            <div>
              <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={handleSaveConfig} disabled={isPending} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors">
              {isPending ? "Saving..." : "Save & Test"}
            </button>
            {configResult && (
              <div className={`flex items-center gap-1.5 text-[11px] ${configResult.success ? "text-badge-green-text" : "text-badge-red-text"}`}>
                {configResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {configResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Full Sync */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Data Sync</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            Pull all data from the legacy API: colours, orders, production runs, and garments. This is incremental — existing records will be updated.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleFullSync}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
              {isPending ? "Syncing..." : "Run Full Sync"}
            </button>
            {syncResult && (
              <div className={`flex items-center gap-1.5 text-[11px] ${syncResult.success ? "text-badge-green-text" : "text-badge-red-text"}`}>
                {syncResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {syncResult.message}
              </div>
            )}
          </div>
        </div>

        {/* Shopify */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Shopify Integration</h3>
          <p className="text-[11px] text-muted-foreground">Coming soon — configure Shopify Admin API for inventory sync.</p>
        </div>
      </div>
    </div>
  );
}
