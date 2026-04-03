import {
  Palette,
  ClipboardList,
  Factory,
  Shirt,
  Leaf,
  Package,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface TabDef {
  name: string;
  nameKey: string;  // i18n key for translated tab name
  slug: string;
}

export interface HubSection {
  id: string;
  label: string;
  labelKey: string;   // i18n key for translated label
  icon: LucideIcon;
  description: string;
  descKey: string;    // i18n key for translated description
  color: string;
  glowColor: string;
  routePrefix: string;
  tabs: TabDef[];
}

// ─── Admin sections (5 circles) ──────────────────────────

export const ADMIN_SECTIONS: HubSection[] = [
  {
    id: "stock",
    label: "STOCK.",
    labelKey: "nav.stock",
    icon: Package,
    description: "Yarn stock & colour codes",
    descKey: "section.stock.desc",
    color: "hsl(142 76% 36%)",
    glowColor: "hsl(142 76% 36% / 0.25)",
    routePrefix: "/stock",
    tabs: [],
  },
  {
    id: "overview",
    label: "ORDERS.",
    labelKey: "nav.orders",
    icon: ClipboardList,
    description: "Orders & pipeline",
    descKey: "section.orders.desc",
    color: "hsl(271 76% 53%)",
    glowColor: "hsl(271 76% 53% / 0.25)",
    routePrefix: "/overview",
    tabs: [],
  },
  {
    id: "new-order",
    label: "NEW ORDER.",
    labelKey: "nav.new_order",
    icon: Zap,
    description: "Upload PO or create order",
    descKey: "section.new_order.desc",
    color: "hsl(217 91% 60%)",
    glowColor: "hsl(217 91% 60% / 0.25)",
    routePrefix: "/orders?upload=true",
    tabs: [],
  },
  {
    id: "garments",
    label: "GARMENTS.",
    labelKey: "nav.garments",
    icon: Shirt,
    description: "Traceability & garment checker",
    descKey: "section.garments.desc",
    color: "hsl(21 90% 48%)",
    glowColor: "hsl(21 90% 48% / 0.25)",
    routePrefix: "/garments",
    tabs: [
      { name: "Checker",    nameKey: "tab.checker",    slug: "list" },
      { name: "Scanning",   nameKey: "tab.scanning",   slug: "scanning" },
      { name: "Statistics", nameKey: "tab.statistics", slug: "statistics" },
    ],
  },
  {
    id: "impact",
    label: "IMPACT.",
    labelKey: "nav.impact",
    icon: Leaf,
    description: "Supplier impact & DPP",
    descKey: "section.impact.desc",
    color: "hsl(174 72% 46%)",
    glowColor: "hsl(174 72% 46% / 0.25)",
    routePrefix: "/impact",
    tabs: [
      { name: "Overview",    nameKey: "tab.overview",     slug: "overview" },
      { name: "By Supplier", nameKey: "tab.by_supplier",  slug: "suppliers" },
    ],
  },
];

// ─── Supplier sections (5 circles) ───────────────────────

export const SUPPLIER_SECTIONS: HubSection[] = [
  {
    id: "production",
    label: "JOBS.",
    labelKey: "nav.jobs",
    icon: Factory,
    description: "Incoming jobs & active runs",
    descKey: "section.jobs.desc",
    color: "hsl(217 91% 60%)",
    glowColor: "hsl(217 91% 60% / 0.25)",
    routePrefix: "/production-runs",
    tabs: [
      { name: "Jobs", nameKey: "tab.jobs", slug: "list" },
    ],
  },
  {
    id: "materials",
    label: "MATERIALS.",
    labelKey: "nav.materials",
    icon: Palette,
    description: "Yarn stock and deliveries",
    descKey: "section.materials.desc",
    color: "hsl(142 76% 36%)",
    glowColor: "hsl(142 76% 36% / 0.25)",
    routePrefix: "/materials",
    tabs: [{ name: "Yarn Stock", nameKey: "tab.yarn_stock", slug: "stock" }],
  },
  {
    id: "garments",
    label: "GARMENTS.",
    labelKey: "nav.garments",
    icon: Shirt,
    description: "Scan and check garments",
    descKey: "section.garments.desc",
    color: "hsl(21 90% 48%)",
    glowColor: "hsl(21 90% 48% / 0.25)",
    routePrefix: "/garments",
    tabs: [
      { name: "Checker",  nameKey: "tab.checker",  slug: "list" },
      { name: "Scanning", nameKey: "tab.scanning", slug: "scanning" },
    ],
  },
  {
    id: "impact",
    label: "IMPACT.",
    labelKey: "nav.impact",
    icon: Leaf,
    description: "Your factory's environmental data",
    descKey: "section.impact.desc",
    color: "hsl(174 72% 46%)",
    glowColor: "hsl(174 72% 46% / 0.25)",
    routePrefix: "/impact",
    tabs: [
      { name: "My Factory", nameKey: "tab.my_factory", slug: "overview" },
    ],
  },
];

// Get sections for a given role
export function getSectionsForRole(role: string): HubSection[] {
  return role === "ADMIN" ? ADMIN_SECTIONS : SUPPLIER_SECTIONS;
}

// Quick action for supplier hub
export const QUICK_ACTION = {
  id: "new-run",
  label: "NEW RUN",
  labelKey: "nav.new_run",
  icon: Zap,
  description: "Start a new production run",
  descKey: "section.new_run.desc",
  color: "hsl(25 95% 53%)",
  glowColor: "hsl(25 95% 53% / 0.25)",
  routePrefix: "/production-runs?create=true",
};

export const SETTINGS_SECTION = {
  id: "settings",
  label: "SETTINGS.",
  icon: Settings,
  routePrefix: "/settings",
};

// For shell sidebar — use role-based sections
export function getShellSections(role: string): HubSection[] {
  return getSectionsForRole(role);
}

// Legacy export (used by shell before role is known)
export const HUB_SECTIONS = ADMIN_SECTIONS;
