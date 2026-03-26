"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, Palette } from "lucide-react";

type ColourEntry = { id: number; millColourCode: string; millColourName: string | null; sheepIncName: string; sheepIncCode: string | null; hexValue: string | null; yarnMill: string | null };

export default function ColourMapPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [colours, setColours] = useState<ColourEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [millCode, setMillCode] = useState("");
  const [millName, setMillName] = useState("");
  const [siName, setSiName] = useState("");
  const [siCode, setSiCode] = useState("");
  const [hex, setHex] = useState("");

  useEffect(() => {
    import("@/lib/actions/colour-map").then(({ getColourMap }) => {
      getColourMap().then((data) => setColours(JSON.parse(JSON.stringify(data))));
    });
  }, []);

  function handleAdd() {
    if (!millCode || !siName) return;
    startTransition(async () => {
      const { upsertColour } = await import("@/lib/actions/colour-map");
      await upsertColour({ millColourCode: millCode, millColourName: millName || undefined, sheepIncName: siName, sheepIncCode: siCode || undefined, hexValue: hex || undefined, yarnMill: "Suedwolle" });
      setMillCode(""); setMillName(""); setSiName(""); setSiCode(""); setHex(""); setShowAdd(false);
      const { getColourMap } = await import("@/lib/actions/colour-map");
      setColours(JSON.parse(JSON.stringify(await getColourMap())));
    });
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = text.trim().split("\n").slice(1); // skip header
    const parsed = rows.map((row) => {
      const cols = row.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      return { millColourCode: cols[0], millColourName: cols[1], sheepIncName: cols[2], sheepIncCode: cols[3], hexValue: cols[4] };
    }).filter((r) => r.millColourCode && r.sheepIncName);

    startTransition(async () => {
      const { bulkImportColours } = await import("@/lib/actions/colour-map");
      const result = await bulkImportColours(parsed);
      alert(`Imported ${result.imported} colours`);
      const { getColourMap } = await import("@/lib/actions/colour-map");
      setColours(JSON.parse(JSON.stringify(await getColourMap())));
    });
  }

  return (
    <div className="px-6 py-8 max-w-[1000px] mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Settings</p>
          <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Master Colour Map</h1>
          <p className="text-[11px] text-muted-foreground mt-1">Maps yarn mill colour codes to Sheep Inc colour names</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer transition-colors">
            <Upload size={12} /> Import CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" disabled={isPending} />
          </label>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-foreground text-background">
            <Plus size={12} /> Add Colour
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Mill Code *</label>
              <input value={millCode} onChange={(e) => setMillCode(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none" placeholder="8M1425" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Mill Name</label>
              <input value={millName} onChange={(e) => setMillName(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none" placeholder="GREY 45" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Sheep Inc Name *</label>
              <input value={siName} onChange={(e) => setSiName(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] text-foreground outline-none" placeholder="Slate Grey" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Sheep Inc Code</label>
              <input value={siCode} onChange={(e) => setSiCode(e.target.value)} className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none" placeholder="CGREY" />
            </div>
            <div>
              <label className="block text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Hex</label>
              <div className="flex gap-1.5">
                <input type="color" value={hex || "#888888"} onChange={(e) => setHex(e.target.value)} className="w-7 h-7 rounded border border-border cursor-pointer" />
                <input value={hex} onChange={(e) => setHex(e.target.value)} className="flex-1 px-2.5 py-1.5 bg-background border border-border rounded-lg text-[11px] font-mono-brand text-foreground outline-none" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={isPending || !millCode || !siName} className="px-3 py-1.5 rounded-lg bg-foreground text-background text-[10px] font-bold uppercase tracking-wider disabled:opacity-40">Add</button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      <p className="text-[10px] font-mono-brand text-muted-foreground mb-3">
        {colours.length} colour{colours.length !== 1 ? "s" : ""} mapped
        <span className="ml-2 text-[9px]">CSV format: mill_code, mill_name, sheep_inc_name, sheep_inc_code, hex</span>
      </p>

      {/* Colour list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {colours.length > 0 ? (
          <table className="w-full text-[11px]">
            <thead className="bg-secondary/30 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Swatch</th>
                <th className="text-left px-4 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Mill Code</th>
                <th className="text-left px-4 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Mill Name</th>
                <th className="text-left px-4 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Sheep Inc Name</th>
                <th className="text-left px-4 py-2 font-mono-brand uppercase tracking-wider text-muted-foreground text-[9px]">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {colours.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-2">
                    {c.hexValue ? <div className="w-5 h-5 rounded border border-border" style={{ backgroundColor: c.hexValue }} /> : <div className="w-5 h-5 rounded border border-border bg-muted" />}
                  </td>
                  <td className="px-4 py-2 font-mono-brand font-bold text-foreground">{c.millColourCode}</td>
                  <td className="px-4 py-2 text-muted-foreground">{c.millColourName || "—"}</td>
                  <td className="px-4 py-2 font-semibold text-foreground">{c.sheepIncName}</td>
                  <td className="px-4 py-2 font-mono-brand text-muted-foreground">{c.sheepIncCode || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Palette size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-[11px] text-muted-foreground">No colours mapped yet. Add individually or import a CSV.</p>
          </div>
        )}
      </div>
    </div>
  );
}
