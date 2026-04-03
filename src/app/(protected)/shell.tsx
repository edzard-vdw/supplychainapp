"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSectionsForRole } from "@/lib/sections";
import { ToastProvider } from "@/components/ui/toast";
import { t } from "@/lib/i18n";

interface ShellProps {
  user: { id: number; email: string; name: string; role: string; supplierId?: number | null; supplierName?: string | null };
  language: string;
  children: React.ReactNode;
}

export function Shell({ user, language, children }: ShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);

  const allSections = getSectionsForRole(user.role);
  // Filter out hub-only action circles from sidebar
  const sections = allSections.filter((s) => s.id !== "new-run" && s.id !== "new-order");

  // Determine active section from pathname
  const isSettingsRoute = pathname.startsWith("/settings");

  // Route aliases: map extra paths to a hub id
  const ROUTE_ALIASES: Record<string, string> = {
    "/orders": "overview",
    "/production-runs": "overview",
    "/stock": "stock",
  };
  const aliasedId = Object.entries(ROUTE_ALIASES).find(([prefix]) => pathname.startsWith(prefix))?.[1];

  const activeSection = isSettingsRoute
    ? null
    : (sections.find((s) => (aliasedId ? s.id === aliasedId : pathname.startsWith(s.routePrefix)))
        ?? sections.find((s) => pathname.startsWith(s.routePrefix))
        ?? sections.find((s) => s.id === "overview")
        ?? sections[0]);

  // Active tab within section
  const activeTabSlug = activeSection && activeSection.tabs.length > 1
    ? activeSection.tabs.find((t) => pathname.includes(t.slug))?.slug ?? activeSection.tabs[0]?.slug ?? ""
    : activeSection?.tabs[0]?.slug ?? "";

  // User initials for avatar button
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-background">
      {/* ── Desktop Sidebar (narrow strip — matches hub) ── */}
      <div className="hidden md:flex flex-col w-14 bg-card border-r border-border shrink-0">
        {/* Circle / Home */}
        <Link
          href="/dashboard"
          className="h-14 flex items-center justify-center border-b border-border hover:bg-secondary/50 transition-colors shrink-0"
          title="Home"
        >
          <div className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-subtle-pulse" />
          </div>
        </Link>

        {/* Section icon links */}
        <div className="flex-1 flex flex-col items-center py-2 gap-0.5">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = !isSettingsRoute && section.id === activeSection?.id;
            return (
              <Link
                key={section.id}
                href={section.routePrefix}
                title={t(section.labelKey, language)}
                className={cn(
                  "relative w-9 h-9 flex items-center justify-center rounded-lg transition-all",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                    style={{ backgroundColor: section.color }}
                  />
                )}
                <Icon
                  size={16}
                  strokeWidth={isActive ? 2 : 1.5}
                  style={isActive ? { color: section.color } : undefined}
                />
              </Link>
            );
          })}
        </div>

        {/* Bottom: settings + user initials */}
        <div className="p-3 flex flex-col items-center gap-2 border-t border-border">
          <Link
            href="/settings"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              isSettingsRoute
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
            title={t("hub.settings", language)}
          >
            <Settings size={15} />
          </Link>
          <div className="w-6 h-px bg-border" />
          <button
            onClick={handleSignOut}
            className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center text-background text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
            title={`${user.name} — Sign out`}
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Mobile header ── */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border bg-card shrink-0 relative z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1 flex items-center justify-center">
            {isSettingsRoute ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                {t("hub.settings", language)}.
              </span>
            ) : (
              <button
                onClick={() => setNavDropdownOpen((o) => !o)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: activeSection?.color }}
                >
                  {activeSection ? t(activeSection.labelKey, language).toUpperCase() + "." : ""}
                </span>
                <ChevronDown
                  size={12}
                  className="transition-transform duration-200"
                  style={{
                    color: activeSection?.color,
                    transform: navDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
            )}
          </div>
          <Link href="/dashboard" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground" title="Home">
            <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
          </Link>
        </div>

        {/* ── Mobile nav dropdown ── */}
        {navDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-20 md:hidden"
              onClick={() => setNavDropdownOpen(false)}
            />
            <div className="absolute top-12 left-0 right-0 z-20 bg-card border-b border-border shadow-lg md:hidden">
              <div className="px-3 py-2 space-y-0.5">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = section.id === activeSection?.id;
                  return (
                    <Link
                      key={section.id}
                      href={section.routePrefix}
                      onClick={() => setNavDropdownOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[12px] font-semibold transition-all",
                        isActive
                          ? "bg-secondary/80 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                      )}
                      style={isActive ? { color: section.color } : undefined}
                    >
                      <Icon size={16} strokeWidth={isActive ? 2 : 1.5} style={isActive ? { color: section.color } : undefined} />
                      {t(section.labelKey, language)}
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Desktop header ── */}
        <div className="hidden md:flex items-center h-14 px-6 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full animate-subtle-pulse"
              style={{ backgroundColor: isSettingsRoute ? "hsl(var(--muted-foreground))" : activeSection?.color }}
            />
            <span
              className="text-[13px] font-bold uppercase tracking-[0.15em]"
              style={{ color: isSettingsRoute ? undefined : activeSection?.color }}
            >
              {isSettingsRoute ? t("hub.settings", language) + "." : activeSection ? t(activeSection.labelKey, language).toUpperCase() + "." : ""}
            </span>
          </div>

          {/* Tab bar — hidden on settings */}
          {!isSettingsRoute && activeSection && activeSection.tabs.length > 1 && (
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
                    {t(tab.nameKey, language)}
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
              {t("hub.signout", language)}
            </button>
          </div>
        </div>

        {/* ── Tab bar (mobile) ── */}
        {!isSettingsRoute && activeSection && activeSection.tabs.length > 1 && (
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
                  {t(tab.nameKey, language)}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── Page content ── */}
        <div className="flex-1 overflow-y-auto">
          <ToastProvider>{children}</ToastProvider>
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
              <span className="text-sm font-bold uppercase tracking-wider">The Thread</span>
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
                const isActive = !isSettingsRoute && section.id === activeSection?.id;
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
                    {t(section.labelKey, language)}
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
                {t("hub.settings", language)}
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
                {t("hub.signout", language)}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
