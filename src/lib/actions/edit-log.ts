"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

// Fields that suppliers are allowed to edit
const SUPPLIER_EDITABLE_FIELDS: Record<string, string[]> = {
  order_line: ["quantity", "notes"],
  production_run: ["quantity", "unitsProduced", "washingProgram", "washingTemperature", "finishingProcess", "finisherName", "finishedDate", "machineGauge", "knitwearPly", "notes"],
  order: [], // Suppliers cannot edit orders directly
};

/**
 * Edit a field on an order/order line/production run with an audit trail.
 * Validates role-based permissions before allowing the edit.
 */
export async function editWithLog(params: {
  entityType: "order" | "order_line" | "production_run";
  entityId: number;
  field: string;
  newValue: string | number;
  note?: string;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) return { success: false, error: "Not authenticated" };

  // Role-based field validation
  if (session.role === "SUPPLIER") {
    const allowed = SUPPLIER_EDITABLE_FIELDS[params.entityType] || [];
    if (!allowed.includes(params.field)) {
      return { success: false, error: `Suppliers cannot edit '${params.field}' on ${params.entityType}` };
    }

    // Verify supplier owns this entity
    if (params.entityType === "production_run") {
      const run = await prisma.productionRun.findUnique({ where: { id: params.entityId }, select: { supplierId: true } });
      if (!run || run.supplierId !== session.supplierId) return { success: false, error: "Not your production run" };
    } else if (params.entityType === "order_line") {
      const line = await prisma.orderLine.findUnique({ where: { id: params.entityId }, include: { order: { select: { supplierId: true } } } });
      if (!line || line.order.supplierId !== session.supplierId) return { success: false, error: "Not your order" };
    }
  }

  // Get current value
  let oldValue: string | null = null;

  if (params.entityType === "order") {
    const order = await prisma.order.findUnique({ where: { id: params.entityId } });
    if (!order) return { success: false, error: "Order not found" };
    oldValue = String((order as Record<string, unknown>)[params.field] ?? "");
    await prisma.order.update({ where: { id: params.entityId }, data: { [params.field]: params.newValue } });
  } else if (params.entityType === "order_line") {
    const line = await prisma.orderLine.findUnique({ where: { id: params.entityId } });
    if (!line) return { success: false, error: "Order line not found" };
    oldValue = String((line as Record<string, unknown>)[params.field] ?? "");
    await prisma.orderLine.update({ where: { id: params.entityId }, data: { [params.field]: params.newValue } });
    // Update order total if quantity changed
    if (params.field === "quantity") {
      const diff = Number(params.newValue) - line.quantity;
      if (diff !== 0) {
        await prisma.order.update({ where: { id: line.orderId }, data: { totalQuantity: { increment: diff } } });
      }
    }
  } else if (params.entityType === "production_run") {
    const run = await prisma.productionRun.findUnique({ where: { id: params.entityId } });
    if (!run) return { success: false, error: "Production run not found" };
    oldValue = String((run as Record<string, unknown>)[params.field] ?? "");
    await prisma.productionRun.update({ where: { id: params.entityId }, data: { [params.field]: params.newValue } });
  }

  // Log the change
  await prisma.editLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      field: params.field,
      oldValue,
      newValue: String(params.newValue),
      note: params.note || null,
      changedBy: session.name || session.email,
      role: session.role,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/production-runs");
  return { success: true };
}

/**
 * Get edit history for an entity.
 */
export async function getEditLog(entityType: string, entityId: number) {
  return prisma.editLog.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } });
}

/**
 * Get all edit logs for an order and its lines.
 */
export async function getOrderEditHistory(orderId: number) {
  const orderLines = await prisma.orderLine.findMany({ where: { orderId }, select: { id: true } });
  const lineIds = orderLines.map((l) => l.id);
  return prisma.editLog.findMany({
    where: { OR: [{ entityType: "order", entityId: orderId }, { entityType: "order_line", entityId: { in: lineIds } }] },
    orderBy: { createdAt: "desc" },
  });
}
