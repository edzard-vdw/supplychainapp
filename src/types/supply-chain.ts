// ─── Status display maps ─────────────────────────────────

export const ORDER_STATUS_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = {
  DRAFT: { label: "Draft", bgClass: "bg-badge-gray-bg", textClass: "text-badge-gray-text" },
  CONFIRMED: { label: "Submitted", bgClass: "bg-badge-blue-bg", textClass: "text-badge-blue-text" },
  ACKNOWLEDGED: { label: "Accepted", bgClass: "bg-badge-emerald-bg", textClass: "text-badge-emerald-text" },
  IN_PRODUCTION: { label: "In Production", bgClass: "bg-badge-orange-bg", textClass: "text-badge-orange-text" },
  QC: { label: "QC / Scan", bgClass: "bg-badge-purple-bg", textClass: "text-badge-purple-text" },
  SHIPPED: { label: "Shipping", bgClass: "bg-badge-sky-bg", textClass: "text-badge-sky-text" },
  DELIVERED: { label: "Received", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
  CANCELLED: { label: "Cancelled", bgClass: "bg-badge-red-bg", textClass: "text-badge-red-text" },
};

export const ORDER_STATUS_ORDER = [
  "DRAFT",
  "CONFIRMED",
  "ACKNOWLEDGED",
  "IN_PRODUCTION",
  "QC",
  "SHIPPED",
  "DELIVERED",
] as const;

// Order status permissions:
// Admin: DRAFT, CONFIRMED (before supplier), DELIVERED (after supplier ships)
// Supplier: ACKNOWLEDGED (confirm receipt), IN_PRODUCTION → SHIPPED (during their work)
export function getOrderAllowedTransitions(currentStatus: string, role: string): string[] {
  if (role === "ADMIN") return [...ORDER_STATUS_ORDER];

  // Supplier can: ACKNOWLEDGED (accept order), then IN_PRODUCTION through SHIPPED
  const supplierStatuses = ["ACKNOWLEDGED", "IN_PRODUCTION", "QC", "SHIPPED"];
  const currentIdx = ORDER_STATUS_ORDER.indexOf(currentStatus as typeof ORDER_STATUS_ORDER[number]);

  // Supplier can acknowledge a CONFIRMED order
  if (currentStatus === "CONFIRMED") return ["ACKNOWLEDGED"];

  // Supplier can move through their zone
  if (currentIdx >= ORDER_STATUS_ORDER.indexOf("ACKNOWLEDGED") && currentIdx <= ORDER_STATUS_ORDER.indexOf("SHIPPED")) {
    return supplierStatuses;
  }

  return []; // Outside supplier control
}

export function isOrderAdminOnly(status: string): boolean {
  return status === "DRAFT" || status === "CONFIRMED" || status === "DELIVERED";
}

export const RUN_STATUS_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = {
  PLANNED: { label: "Planned", bgClass: "bg-badge-gray-bg", textClass: "text-badge-gray-text" },
  IN_PRODUCTION: { label: "In Production", bgClass: "bg-badge-orange-bg", textClass: "text-badge-orange-text" },
  QC: { label: "QC / Scan", bgClass: "bg-badge-purple-bg", textClass: "text-badge-purple-text" },
  SHIPPED: { label: "Shipping", bgClass: "bg-badge-sky-bg", textClass: "text-badge-sky-text" },
  RECEIVED: { label: "Received", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
  // COMPLETED kept for display-only backward compat — treated as RECEIVED in UI
  COMPLETED: { label: "Received", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
};

// ─── Run status flow ─────────────────────────────────────

// Full pipeline (admin sees all) — RECEIVED is the terminal state
export const RUN_STATUS_ORDER = [
  "PLANNED",
  "IN_PRODUCTION",
  "QC",
  "SHIPPED",
  "RECEIVED",
] as const;

// Supplier pipeline — stages they control
export const SUPPLIER_RUN_STATUS_ORDER = [
  "PLANNED",
  "IN_PRODUCTION",
  "QC",
  "SHIPPED",
] as const;

export function getRunStatusOrder(role: string) {
  return role === "ADMIN" ? RUN_STATUS_ORDER : SUPPLIER_RUN_STATUS_ORDER;
}

// Who can transition to which status
export function getAllowedTransitions(currentStatus: string, role: string): string[] {
  // Treat legacy COMPLETED as RECEIVED
  const normalised = currentStatus === "COMPLETED" ? "RECEIVED" : currentStatus;
  const currentIdx = RUN_STATUS_ORDER.indexOf(normalised as typeof RUN_STATUS_ORDER[number]);
  if (currentIdx === -1) return [];
  if (role === "ADMIN") return [...RUN_STATUS_ORDER];
  const supplierMax = RUN_STATUS_ORDER.indexOf("SHIPPED");
  const allowed: string[] = [];
  for (let i = 0; i <= supplierMax; i++) allowed.push(RUN_STATUS_ORDER[i]);
  return allowed;
}

// Whether a status is admin-only (supplier cannot set it)
export function isAdminOnlyStatus(status: string): boolean {
  return status === "RECEIVED" || status === "COMPLETED";
}

// ─── Formatters ──────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${kg.toFixed(1)}kg`;
}
