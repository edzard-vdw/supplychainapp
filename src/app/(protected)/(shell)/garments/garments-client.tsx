"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Shirt, Nfc, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/types/supply-chain";

type GarmentRow = {
  id: number;
  garmentCode: string;
  size: string | null;
  style: string | null;
  product: string | null;
  nfcTagId: string | null;
  qrCode: string | null;
  isTagged: boolean;
  taggedAt: Date | null;
  createdAt: Date;
  color: { name: string; hexValue: string | null } | null;
  productionRun: { runCode: string; status: string } | null;
};

export function GarmentsClient({ initialGarments }: { initialGarments: GarmentRow[] }) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"ALL" | "TAGGED" | "UNTAGGED">("ALL");

  const filtered = initialGarments.filter((g) => {
    const matchSearch =
      g.garmentCode.toLowerCase().includes(search.toLowerCase()) ||
      (g.product && g.product.toLowerCase().includes(search.toLowerCase())) ||
      (g.color?.name.toLowerCase().includes(search.toLowerCase()));
    const matchTag =
      tagFilter === "ALL" ||
      (tagFilter === "TAGGED" && g.isTagged) ||
      (tagFilter === "UNTAGGED" && !g.isTagged);
    return matchSearch && matchTag;
  });

  const taggedCount = initialGarments.filter((g) => g.isTagged).length;

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Garments</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">All Garments</h1>
        </div>
        <Link
          href="/garments/scanning"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white transition-colors"
          style={{ backgroundColor: "hsl(142 76% 36%)" }}
        >
          <Nfc size={14} /> Scan
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Total</p>
          <p className="text-[22px] font-bold tabular-nums">{initialGarments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tagged</p>
          <p className="text-[22px] font-bold tabular-nums text-badge-green-text">{taggedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Untagged</p>
          <p className="text-[22px] font-bold tabular-nums text-badge-orange-text">{initialGarments.length - taggedCount}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search garments..." className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-lg text-[12px] text-foreground placeholder-muted-foreground outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-0.5">
          {(["ALL", "TAGGED", "UNTAGGED"] as const).map((f) => (
            <button key={f} onClick={() => setTagFilter(f)} className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${tagFilter === f ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f === "ALL" ? "All" : f === "TAGGED" ? "Tagged" : "Untagged"}
            </button>
          ))}
        </div>
      </div>

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-4">{filtered.length} garment{filtered.length !== 1 ? "s" : ""}</p>

      {/* Garment grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((g) => (
          <Link
            key={g.id}
            href={`/garments/${g.id}`}
            className="bg-card border border-border rounded-xl p-4 hover:bg-secondary/30 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-2">
              {g.color?.hexValue && (
                <div className="w-4 h-4 rounded border border-border shrink-0" style={{ backgroundColor: g.color.hexValue }} />
              )}
              <p className="text-[12px] font-semibold text-foreground truncate">{g.garmentCode}</p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-3">
              {g.product || "—"} · {g.color?.name || "—"} · {g.size || "—"}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {g.isTagged ? (
                <Badge label="Tagged" bgClass="bg-badge-green-bg" textClass="text-badge-green-text" />
              ) : (
                <Badge label="Untagged" bgClass="bg-badge-orange-bg" textClass="text-badge-orange-text" />
              )}
              {g.nfcTagId && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Nfc size={9} /> NFC
                </span>
              )}
              {g.qrCode && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <QrCode size={9} /> QR
                </span>
              )}
            </div>
            {g.productionRun && (
              <p className="text-[9px] text-muted-foreground mt-2">Run: {g.productionRun.runCode}</p>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Shirt size={24} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-[13px] font-semibold text-foreground mb-1">No garments found</p>
          <p className="text-[11px] text-muted-foreground">Garments are created during scanning or production runs</p>
        </div>
      )}
    </div>
  );
}
