import { getGarmentStats } from "@/lib/actions/garments";

export default async function StatisticsPage() {
  const stats = await getGarmentStats();
  const taggedPct = stats.total > 0 ? Math.round((stats.tagged / stats.total) * 100) : 0;

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Garments</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Statistics</h1>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Total Garments</p>
          <p className="text-[28px] font-bold tabular-nums">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tagged</p>
          <p className="text-[28px] font-bold tabular-nums text-badge-green-text">{stats.tagged}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Untagged</p>
          <p className="text-[28px] font-bold tabular-nums text-badge-orange-text">{stats.untagged}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Tag Rate</p>
          <p className="text-[28px] font-bold tabular-nums">{taggedPct}%</p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-badge-green-text" style={{ width: `${taggedPct}%` }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by colour */}
        {stats.byColor.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">By Colour</h3>
            <div className="space-y-2.5">
              {stats.byColor.map((c) => {
                const maxCount = stats.byColor[0]?.count || 1;
                return (
                  <div key={c.colorId ?? "unknown"} className="flex items-center gap-3">
                    {c.hex ? (
                      <div className="w-4 h-4 rounded border border-border shrink-0" style={{ backgroundColor: c.hex }} />
                    ) : (
                      <div className="w-4 h-4 rounded border border-border bg-muted shrink-0" />
                    )}
                    <span className="text-[11px] text-foreground w-24 truncate">{c.name}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(c.count / maxCount) * 100}%`,
                          backgroundColor: c.hex || "hsl(271 76% 53%)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono-brand text-muted-foreground w-10 text-right tabular-nums">{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Breakdown by size */}
        {stats.bySize.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-4">By Size</h3>
            <div className="space-y-2.5">
              {stats.bySize.map((s) => {
                const maxCount = stats.bySize[0]?._count || 1;
                return (
                  <div key={s.size} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono-brand text-foreground w-12 font-bold">{s.size}</span>
                    <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(s._count / maxCount) * 100}%`,
                          backgroundColor: "hsl(142 76% 36%)",
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono-brand text-muted-foreground w-10 text-right tabular-nums">{s._count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {stats.total === 0 && (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <p className="text-[13px] font-semibold text-foreground mb-1">No data yet</p>
          <p className="text-[11px] text-muted-foreground">Statistics will appear once garments are created and tagged</p>
        </div>
      )}
    </div>
  );
}
