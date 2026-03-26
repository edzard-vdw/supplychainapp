"use client";

import { useState, useEffect } from "react";
import { Bug } from "lucide-react";

type SupplierOption = { id: number; name: string; type: string };

export function DevRoleToggle() {
  const [open, setOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [currentSupplierId, setCurrentSupplierId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/dev/switch-role")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCurrentRole(d.data.currentRole);
          setCurrentSupplierId(d.data.currentSupplierId);
          setSuppliers(d.data.suppliers);
        }
      })
      .catch(() => {});
  }, []);

  async function switchTo(role: string, supplierId?: number) {
    setSwitching(true);
    try {
      const res = await fetch("/api/dev/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, supplierId }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentRole(data.data.role);
        setCurrentSupplierId(data.data.supplierId);
        // Hard refresh to reload all server components with new role
        window.location.href = "/dashboard";
      }
    } catch {
      // ignore
    }
    setSwitching(false);
  }

  return (
    <div className="fixed top-4 right-4 z-[100]">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
          currentRole === "ADMIN" ? "bg-foreground text-background" : "bg-badge-blue-text text-white"
        }`}
        title="DEV: Switch role"
      >
        <Bug size={16} />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute top-12 right-0 w-64 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border bg-secondary/30">
            <p className="text-[9px] font-mono-brand uppercase tracking-widest text-muted-foreground">Dev Role Toggle</p>
            <p className="text-[11px] font-semibold text-foreground">
              {currentRole} {currentSupplierId ? `(#${currentSupplierId})` : ""}
            </p>
          </div>

          <div className="p-2 space-y-1">
            {/* Admin */}
            <button
              onClick={() => switchTo("ADMIN")}
              disabled={switching || currentRole === "ADMIN"}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                currentRole === "ADMIN"
                  ? "bg-foreground text-background"
                  : "text-foreground hover:bg-secondary/50"
              } disabled:opacity-50`}
            >
              <div className="w-2 h-2 rounded-full bg-foreground" />
              Admin
            </button>

            {/* Suppliers */}
            {suppliers.map((s) => (
              <button
                key={s.id}
                onClick={() => switchTo("SUPPLIER", s.id)}
                disabled={switching || (currentRole === "SUPPLIER" && currentSupplierId === s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  currentRole === "SUPPLIER" && currentSupplierId === s.id
                    ? "bg-badge-blue-text text-white"
                    : "text-foreground hover:bg-secondary/50"
                } disabled:opacity-50`}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(217 91% 60%)" }} />
                {s.name}
                <span className="text-[9px] text-muted-foreground ml-auto">{s.type}</span>
              </button>
            ))}
          </div>

          {switching && (
            <div className="px-3 py-2 text-center">
              <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
