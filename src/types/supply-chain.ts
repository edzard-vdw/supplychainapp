// ─── Status display maps ─────────────────────────────────

export const ORDER_STATUS_DISPLAY: Record<string, { label: string; bgClass: string; textClass: string }> = {
  DRAFT: { label: "Draft", bgClass: "bg-badge-gray-bg", textClass: "text-badge-gray-text" },
  CONFIRMED: { label: "Submitted", bgClass: "bg-badge-blue-bg", textClass: "text-badge-blue-text" },
  ACKNOWLEDGED: { label: "Acknowledged", bgClass: "bg-badge-emerald-bg", textClass: "text-badge-emerald-text" },
  IN_PRODUCTION: { label: "In Production", bgClass: "bg-badge-orange-bg", textClass: "text-badge-orange-text" },
  QC: { label: "QC", bgClass: "bg-badge-purple-bg", textClass: "text-badge-purple-text" },
  SHIPPED: { label: "Shipped", bgClass: "bg-badge-sky-bg", textClass: "text-badge-sky-text" },
  DELIVERED: { label: "Delivered", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
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
  QC: { label: "QC", bgClass: "bg-badge-purple-bg", textClass: "text-badge-purple-text" },
  READY_TO_SHIP: { label: "Ready to Ship", bgClass: "bg-badge-emerald-bg", textClass: "text-badge-emerald-text" },
  SHIPPED: { label: "Shipped", bgClass: "bg-badge-sky-bg", textClass: "text-badge-sky-text" },
  RECEIVED: { label: "Received", bgClass: "bg-badge-blue-bg", textClass: "text-badge-blue-text" },
  COMPLETED: { label: "Completed", bgClass: "bg-badge-green-bg", textClass: "text-badge-green-text" },
};

// ─── Run status flow ─────────────────────────────────────

// Full pipeline (admin sees all)
export const RUN_STATUS_ORDER = [
  "PLANNED",
  "IN_PRODUCTION",
  "QC",
  "READY_TO_SHIP",
  "SHIPPED",
  "RECEIVED",
  "COMPLETED",
] as const;

// Supplier pipeline — only stages they control
export const SUPPLIER_RUN_STATUS_ORDER = [
  "PLANNED",
  "IN_PRODUCTION",
  "QC",
  "READY_TO_SHIP",
  "SHIPPED",
] as const;

export function getRunStatusOrder(role: string) {
  return role === "ADMIN" ? RUN_STATUS_ORDER : SUPPLIER_RUN_STATUS_ORDER;
}

// Who can transition to which status
// ADMIN can set any status (forward or backward)
// SUPPLIER can move forward or backward within their range (up to SHIPPED)
export function getAllowedTransitions(currentStatus: string, role: string): string[] {
  const currentIdx = RUN_STATUS_ORDER.indexOf(currentStatus as typeof RUN_STATUS_ORDER[number]);
  if (currentIdx === -1) return [];

  if (role === "ADMIN") {
    // Admin can move to any status
    return [...RUN_STATUS_ORDER];
  }

  // Supplier can move forward or backward up to SHIPPED
  const supplierMax = RUN_STATUS_ORDER.indexOf("SHIPPED");
  const allowed: string[] = [];
  for (let i = 0; i <= supplierMax; i++) {
    allowed.push(RUN_STATUS_ORDER[i]);
  }
  return allowed;
}

// Whether a status is a "supplier" status or "admin" status
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
