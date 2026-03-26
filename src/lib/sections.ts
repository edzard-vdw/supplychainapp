import {
  LayoutDashboard,
  Palette,
  ClipboardList,
  Factory,
  Shirt,
  Package,
  Leaf,
  Settings,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface TabDef {
  name: string;
  slug: string;
}

export interface HubSection {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  color: string;
  glowColor: string;
  routePrefix: string;
  tabs: TabDef[];
}

// ─── Admin sections (5 circles) ──────────────────────────

export const ADMIN_SECTIONS: HubSection[] = [
  {
    id: "overview",
    label: "OVERVIEW.",
    icon: LayoutDashboard,
    description: "Runs, suppliers & stock",
    color: "hsl(21 90% 48%)",
    glowColor: "hsl(21 90% 48% / 0.25)",
    routePrefix: "/overview",
    tabs: [
      { name: "All Runs", slug: "runs" },
      { name: "By Supplier", slug: "suppliers" },
      { name: "Stock", slug: "stock" },
    ],
  },
  {
    id: "orders",
    label: "ORDERS.",
    icon: ClipboardList,
    description: "All orders & POs",
    color: "hsl(271 76% 53%)",
    glowColor: "hsl(271 76% 53% / 0.25)",
    routePrefix: "/orders",
    tabs: [{ name: "All Orders", slug: "list" }],
  },
  {
    id: "new-order",
    label: "NEW ORDER.",
    icon: Zap,
    description: "Upload PO or create order",
    color: "hsl(217 91% 60%)",
    glowColor: "hsl(217 91% 60% / 0.25)",
    routePrefix: "/orders?upload=true",
    tabs: [{ name: "Create", slug: "create" }],
  },
  {
    id: "garments",
    label: "GARMENTS.",
    icon: Shirt,
    description: "Traceability & garment checker",
    color: "hsl(142 76% 36%)",
    glowColor: "hsl(142 76% 36% / 0.25)",
    routePrefix: "/garments",
    tabs: [
      { name: "Checker", slug: "list" },
      { name: "Scanning", slug: "scanning" },
      { name: "Statistics", slug: "statistics" },
    ],
  },
  {
    id: "impact",
    label: "IMPACT.",
    icon: Leaf,
    description: "Supplier impact & DPP",
    color: "hsl(174 72% 46%)",
    glowColor: "hsl(174 72% 46% / 0.25)",
    routePrefix: "/impact",
    tabs: [
      { name: "Overview", slug: "overview" },
      { name: "By Supplier", slug: "suppliers" },
    ],
  },
];

// ─── Supplier sections (5 circles) ───────────────────────

export const SUPPLIER_SECTIONS: HubSection[] = [
  {
    id: "production",
    label: "PRODUCTION.",
    icon: Factory,
    description: "Orders & production runs",
    color: "hsl(271 76% 53%)",
    glowColor: "hsl(271 76% 53% / 0.25)",
    routePrefix: "/production-runs",
    tabs: [
      { name: "Runs", slug: "list" },
      { name: "Orders", slug: "orders" },
    ],
  },
  {
    id: "materials",
    label: "MATERIALS.",
    icon: Palette,
    description: "Yarn deliveries & stock",
    color: "hsl(21 90% 48%)",
    glowColor: "hsl(21 90% 48% / 0.25)",
    routePrefix: "/materials",
    tabs: [{ name: "Yarn Stock", slug: "stock" }],
  },
  {
    id: "new-run",
    label: "NEW RUN.",
    icon: Zap,
    description: "Start a production run",
    color: "hsl(217 91% 60%)",
    glowColor: "hsl(217 91% 60% / 0.25)",
    routePrefix: "/production-runs?create=true",
    tabs: [{ name: "Create", slug: "create" }],
  },
  {
    id: "garments",
    label: "GARMENTS.",
    icon: Shirt,
    description: "Tag, scan & check garments",
    color: "hsl(142 76% 36%)",
    glowColor: "hsl(142 76% 36% / 0.25)",
    routePrefix: "/garments",
    tabs: [
      { name: "Checker", slug: "list" },
      { name: "Scanning", slug: "scanning" },
    ],
  },
  {
    id: "impact",
    label: "IMPACT.",
    icon: Leaf,
    description: "Your facility impact data",
    color: "hsl(174 72% 46%)",
    glowColor: "hsl(174 72% 46% / 0.25)",
    routePrefix: "/impact",
    tabs: [
      { name: "My Data", slug: "my-data" },
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
  icon: Zap,
  description: "Start a new production run",
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
