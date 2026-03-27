"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Settings, LogOut, Disc } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSectionsForRole, type HubSection } from "@/lib/sections";

interface ShellProps {
  user: { id: number; email: string; name: string; role: string; supplierId?: number | null; supplierName?: string | null };
  children: React.ReactNode;
}

export function Shell({ user, children }: ShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const allSections = getSectionsForRole(user.role);
  // Filter out hub-only action circles from sidebar
  const sections = allSections.filter((s) => s.id !== "new-run" && s.id !== "new-order");

  // Determine active section from pathname
  const activeSection = sections.find((s) =>
    pathname.startsWith(s.routePrefix)
  ) ?? sections[0];

  // Active tab within section
  const activeTabSlug = activeSection.tabs.length > 1
    ? activeSection.tabs.find((t) => pathname.includes(t.slug))?.slug ?? activeSection.tabs[0].slug
    : activeSection.tabs[0].slug;

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background">
      {/* ── Desktop Sidebar (icon + label rail) ── */}
      <div className="hidden md:flex flex-col w-[160px] bg-card border-r border-border shrink-0">
        {/* Logo / Home */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 h-14 px-4 border-b border-border hover:bg-secondary/50 transition-colors"
          title="Home"
        >
          <Disc size={18} className="text-foreground shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">The Loom</span>
        </Link>

        {/* Section links with labels */}
        <div className="flex-1 flex flex-col py-2 gap-0.5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = section.id === activeSection.id;
            return (
              <Link
                key={section.id}
                href={section.routePrefix}
                title={section.label}
                className={cn(
                  "relative flex items-center gap-2.5 h-10 mx-1.5 px-2.5 rounded-lg transition-all",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full"
                    style={{ backgroundColor: section.color }}
                  />
                )}
                <Icon size={16} className="shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-wider truncate">{section.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Settings + user */}
        <div className="flex flex-col py-3 gap-1 border-t border-border px-1.5">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            title="Settings"
          >
            <Settings size={15} className="shrink-0" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Settings</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors text-left"
            title="Sign out"
          >
            <LogOut size={15} className="shrink-0" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Mobile header ── */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.15em]"
              style={{ color: activeSection.color }}
            >
              {activeSection.label}
            </span>
          </div>
          <Link href="/dashboard" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground">
            <Disc size={18} />
          </Link>
        </div>

        {/* ── Desktop header ── */}
        <div className="hidden md:flex items-center h-14 px-6 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-subtle-pulse"
              style={{ backgroundColor: activeSection.color }}
            />
            <span
              className="text-[13px] font-bold uppercase tracking-[0.15em]"
              style={{ color: activeSection.color }}
            >
              {activeSection.label}
            </span>
          </div>

          {/* Tab bar */}
          {activeSection.tabs.length > 1 && (
            <div className="ml-10 flex gap-0">
              {activeSection.tabs.map((tab) => {
                const tabHref = `${activeSection.routePrefix}${tab.slug === activeSection.tabs[0].slug ? "" : `/${tab.slug}`}`;
                const isActive = activeTabSlug === tab.slug;
                return (
                  <Link
                    key={tab.slug}
                    href={tabHref}
                    className={cn(
                      "py-4 px-5 text-[11px] font-bold uppercase tracking-[0.12em] border-b-2 transition-all whitespace-nowrap",
                      isActive
                        ? "text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                    style={isActive ? { borderColor: activeSection.color } : undefined}
                  >
                    {tab.name}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground font-mono-brand">
              {user.name}
            </span>
            <button
              onClick={handleSignOut}
              className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ── Tab bar (mobile) ── */}
        {activeSection.tabs.length > 1 && (
          <div className="md:hidden flex border-b border-border bg-card overflow-x-auto scrollbar-none shrink-0">
            {activeSection.tabs.map((tab) => {
              const tabHref = `${activeSection.routePrefix}${tab.slug === activeSection.tabs[0].slug ? "" : `/${tab.slug}`}`;
              const isActive = activeTabSlug === tab.slug;
              return (
                <Link
                  key={tab.slug}
                  href={tabHref}
                  className={cn(
                    "py-3 px-4 text-[10px] font-bold uppercase tracking-[0.12em] border-b-2 transition-all whitespace-nowrap",
                    isActive
                      ? "text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  style={isActive ? { borderColor: activeSection.color } : undefined}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Page content ── */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      {/* ── Mobile slide-out menu ── */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 md:hidden flex flex-col">
            <div className="flex items-center justify-between h-14 px-5 border-b border-border">
              <span className="text-sm font-bold uppercase tracking-wider">The Loom</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
                Menu
              </p>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = section.id === activeSection.id;
                return (
                  <Link
                    key={section.id}
                    href={section.routePrefix}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-semibold uppercase tracking-wider transition-all",
                      isActive
                        ? "bg-secondary/80 text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                    style={isActive ? { color: section.color } : undefined}
                  >
                    <Icon size={16} />
                    {section.label}
                  </Link>
                );
              })}

              <div className="my-4 border-t border-border" />

              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
                Tools
              </p>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
              >
                <Settings size={16} />
                Settings
              </Link>
            </div>

            <div className="border-t border-border px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-medium text-foreground">{user.name}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{user.role === "SUPPLIER" ? "Factory User" : user.role === "ADMIN" ? "Manager" : user.role}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
