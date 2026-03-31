"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, X, Zap, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { getSectionsForRole, QUICK_ACTION } from "@/lib/sections";

interface HubViewProps {
  user: { name: string; role: string; supplierId: number | null; supplierName: string | null };
  stats: {
    orderCount: number;
    runCount: number;
    garmentCount: number;
    materialCount: number;
    taggedCount: number;
    activeRunCount: number;
    pendingRunCount: number;
    pendingOrders: number;
  };
}

// Pre-compute SVG radial lines
const RADIAL_LINES = Array.from({ length: 16 }).map((_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const cx = 50;
  const cy = 50;
  const len = 80;
  return {
    x2: `${(cx + Math.cos(angle) * len).toFixed(6)}%`,
    y2: `${(cy + Math.sin(angle) * len).toFixed(6)}%`,
  };
});

export function HubView({ user, stats }: HubViewProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() => Math.floor(getSectionsForRole(user.role).length / 2));
  const touchRef = useRef({ startX: 0, startY: 0 });

  const isAdmin = user.role === "ADMIN";
  const sections = getSectionsForRole(user.role);

  useEffect(() => { setMounted(true); }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  // Mobile touch handlers
  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current.startX = e.touches[0].clientX;
    touchRef.current.startY = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const deltaX = e.changedTouches[0].clientX - touchRef.current.startX;
    const deltaY = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX < 0 && activeIndex < sections.length - 1) {
        setActiveIndex((prev) => prev + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        setActiveIndex((prev) => prev - 1);
      }
    }
  }

  const activeSection = sections[activeIndex];

  return (
    <div className="h-dvh w-full bg-background relative overflow-hidden flex flex-col">
      {/* Geometric background — radial circles + lines */}
      {/* Geometric background — offset centre for sidebar on desktop */}
      {mounted && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          {/* Desktop: centre offset by half sidebar (28px ≈ 2%) to align with content area */}
          {RADIAL_LINES.map((line, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const cx = 52; // offset slightly right for sidebar
            const cy = 50;
            const len = 80;
            return (
              <line
                key={i}
                x1={`${cx}%`}
                y1={`${cy}%`}
                x2={`${(cx + Math.cos(angle) * len).toFixed(2)}%`}
                y2={`${(cy + Math.sin(angle) * len).toFixed(2)}%`}
                stroke="hsl(214 32% 91%)"
                strokeWidth="0.5"
              />
            );
          })}
          {[10, 20, 35, 55].map((r) => (
            <circle key={r} cx="52%" cy="50%" r={`${r}%`} fill="none" stroke="hsl(214 32% 91%)" strokeWidth="0.5" />
          ))}
        </svg>
      )}

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-50 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-card border-r border-border z-50 md:hidden flex flex-col"
            >
              <div className="h-12 px-4 flex items-center justify-between border-b border-border">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">The Loom</span>
                <button onClick={() => setMobileMenuOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link
                      key={s.id}
                      href={s.routePrefix}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
                    >
                      <Icon size={18} strokeWidth={1.5} style={{ color: s.color }} />
                      <span className="text-sm font-medium">{s.label.replace(".", "")}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-[10px] font-bold">{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.role}</p>
                </div>
                <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Desktop sidebar strip ── */}
      <div className="hidden md:flex absolute left-0 top-0 bottom-0 w-14 bg-card border-r border-border flex-col items-center z-10">
        <Link href="/dashboard" className="h-14 flex items-center justify-center border-b border-border w-full hover:bg-secondary/50 transition-colors" title="Home">
          <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-subtle-pulse" />
          </div>
        </Link>
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground" style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
            THE LOOM
          </span>
        </div>
        <div className="p-3 flex flex-col items-center gap-2">
          <div className="w-6 h-px bg-border" />
          <Link href="/settings" className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </Link>
          <div className="w-6 h-px bg-border" />
          <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-[10px] font-bold cursor-pointer" title={`${user.name} — Sign out`}>
            {initials}
          </button>
          <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{user.role}</span>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div className="h-14 md:ml-14 flex items-center justify-between px-4 md:px-8 relative z-10 shrink-0">
        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors">
          <Menu size={20} />
        </button>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] font-mono-brand md:hidden">The Loom</span>
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] font-mono-brand hidden md:inline">Sheep Inc.</span>
        <Link href="/dashboard" className="md:hidden w-8 h-8 flex items-center justify-center" title="Home">
          <div className="w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-subtle-pulse" />
          </div>
        </Link>
        <div className="hidden md:block w-9" />
      </div>

      {/* ── Supplier welcome + action required ── */}
      {!isAdmin && user.supplierName && (
        <div className="md:ml-14 px-6 md:px-8 relative z-10 shrink-0">
          <div className="py-3 text-center md:text-left">
            <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">
              Supplier Portal
            </p>
            <p className="text-[14px] font-bold text-foreground">
              {user.supplierName}
            </p>
          </div>
          {/* Pending orders alert */}
          {stats.pendingOrders > 0 && (
            <Link
              href="/production-runs/orders"
              className="flex items-center gap-3 p-3 rounded-xl bg-badge-blue-bg border border-badge-blue-text/20 hover:bg-badge-blue-bg/80 transition-colors mb-2"
            >
              <div className="w-8 h-8 rounded-full bg-badge-blue-text text-white flex items-center justify-center text-[12px] font-bold shrink-0">
                {stats.pendingOrders}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground">
                  {stats.pendingOrders === 1 ? "New order needs your attention" : `${stats.pendingOrders} new orders need your attention`}
                </p>
                <p className="text-[10px] text-badge-blue-text">Tap to review and accept →</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── Desktop: Circle grid ── */}
      <div className="hidden md:flex flex-1 ml-14 items-center justify-center relative z-10">
        <div className="flex items-center justify-center gap-6 lg:gap-8 w-full px-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={section.routePrefix}
                className="group flex flex-col items-center gap-3 outline-none shrink-0"
              >
                <div
                  className="relative w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-card"
                  style={{ borderColor: section.color }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 25px ${section.glowColor}, 0 0 50px ${section.glowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0px transparent";
                  }}
                >
                  {/* Inner icon circle */}
                  {section.id === "new-run" || section.id === "new-order" ? (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-lg"
                      style={{ backgroundColor: section.color }}
                    >
                      <Plus size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-sm animate-subtle-pulse">
                      <Icon size={18} style={{ color: section.color }} strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Concentric ring decorations */}
                  <div className="absolute inset-1 rounded-full border opacity-15 transition-opacity duration-300 group-hover:opacity-40" style={{ borderColor: section.color }} />
                  <div className="absolute inset-2.5 rounded-full border opacity-[0.08] transition-opacity duration-300 group-hover:opacity-25" style={{ borderColor: section.color }} />
                </div>

                <div className="text-center flex flex-col justify-start">
                  <p className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.12em] text-foreground leading-tight whitespace-pre-line">
                    {section.label}
                  </p>
                  <p className="text-[8px] lg:text-[9px] text-muted-foreground mt-0.5 leading-snug whitespace-nowrap">
                    {section.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Mobile: Swipe carousel ── */}
      <div
        className="md:hidden flex-1 flex flex-col items-center justify-center relative z-10"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Conveyor belt — active always centred, absolute layout */}
        <div className="relative w-full overflow-hidden" style={{ height: 120 }}>
          {sections.map((section, i) => {
            const Icon = section.icon;
            const offset = i - activeIndex;
            const absOffset = Math.abs(offset);
            const isActive = absOffset === 0;
            const size = absOffset === 0 ? 96 : absOffset === 1 ? 74 : 56;
            const innerSize = size * 0.46;
            const iconSize = absOffset === 0 ? 26 : absOffset === 1 ? 18 : 14;
            const spacing = 72;
            // x formula keeps every circle's visual centre at offset * spacing from container centre
            const x = offset * spacing + (48 - size / 2);

            return (
              <motion.button
                key={section.id}
                animate={{ x, width: size, height: size }}
                transition={{ type: "spring", stiffness: 360, damping: 32 }}
                onClick={() => isActive ? router.push(section.routePrefix) : setActiveIndex(i)}
                className="outline-none absolute flex items-center justify-center rounded-full bg-card border-2"
                style={{
                  top: "50%",
                  left: "calc(50% - 48px)",
                  marginTop: -48,
                  borderColor: section.color,
                  boxShadow: isActive
                    ? `0 0 28px ${section.glowColor}, 0 0 56px ${section.glowColor}`
                    : "0 2px 8px rgba(0,0,0,0.06)",
                  zIndex: isActive ? 10 : 5 - absOffset,
                }}
              >
                {isActive && (
                  <>
                    <div className="absolute inset-2 rounded-full border opacity-20" style={{ borderColor: section.color }} />
                    <div className="absolute inset-4 rounded-full border opacity-10" style={{ borderColor: section.color }} />
                  </>
                )}
                {section.id === "new-run" || section.id === "new-order" ? (
                  <div className="rounded-full flex items-center justify-center" style={{ width: innerSize, height: innerSize, backgroundColor: section.color }}>
                    <Plus size={iconSize} className="text-white" strokeWidth={2.5} />
                  </div>
                ) : (
                  <div className="rounded-full bg-secondary/50 flex items-center justify-center" style={{ width: innerSize, height: innerSize }}>
                    <Icon size={iconSize} style={{ color: section.color }} strokeWidth={1.5} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Active section label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="text-center mt-6"
          >
            <p className="text-[15px] font-bold uppercase tracking-[0.15em] text-foreground">
              {activeSection.label}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {activeSection.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="flex items-center gap-2 mt-6">
          {sections.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                backgroundColor: i === activeIndex ? activeSection.color : "hsl(214 32% 91%)",
                transform: i === activeIndex ? "scale(1.5)" : "scale(1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center pb-5 shrink-0">
        <p className="text-[9px] text-muted-foreground/30 tracking-[0.25em] uppercase font-mono-brand">
          The Loom — Supply Chain
        </p>
      </div>
    </div>
  );
}
