"use server";

import { prisma } from "@/lib/db";
import { apiGet } from "./sheep-api-client";

interface LegacyOrder {
  id: number;
  status: string;
  due_date: string | null;
  manufacturer: string | null;
  client: string | null;
  quantity: number;
  units_produced: number;
  line_count: number;
  priority: number;
}

interface LegacyOrderLine {
  id: number;
  product: string;
  color: string | null;
  size: string | null;
  style: string | null;
  units: number;
  units_produced: number;
}

function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    completed: "DELIVERED",
    in_progress: "IN_PRODUCTION",
    pending: "CONFIRMED",
    draft: "DRAFT",
    shipped: "SHIPPED",
    cancelled: "CANCELLED",
  };
  return statusMap[status?.toLowerCase()] || "DRAFT";
}

export async function pullOrders(): Promise<{ success: boolean; pulled: number; error?: string }> {
  const res = await apiGet<LegacyOrder[]>("/orders");
  if (!res.success || !res.data) return { success: false, pulled: 0, error: res.error };

  let pulled = 0;

  for (const order of res.data) {
    try {
      await prisma.order.upsert({
        where: { externalId: order.id },
        update: {
          status: mapStatus(order.status) as "DRAFT" | "CONFIRMED" | "IN_PRODUCTION" | "QC" | "SHIPPED" | "DELIVERED" | "CANCELLED",
          manufacturer: order.manufacturer,
          client: order.client,
          dueDate: order.due_date ? new Date(order.due_date) : null,
          totalQuantity: order.quantity || 0,
          priority: order.priority || 0,
          lastSyncAt: new Date(),
        },
        create: {
          orderRef: `EXT-${order.id}`,
          externalId: order.id,
          status: mapStatus(order.status) as "DRAFT" | "CONFIRMED" | "IN_PRODUCTION" | "QC" | "SHIPPED" | "DELIVERED" | "CANCELLED",
          manufacturer: order.manufacturer,
          client: order.client,
          dueDate: order.due_date ? new Date(order.due_date) : null,
          totalQuantity: order.quantity || 0,
          priority: order.priority || 0,
          lastSyncAt: new Date(),
        },
      });

      // Pull order lines
      const linesRes = await apiGet<LegacyOrderLine[]>(`/orders/${order.id}/order-lines`);
      if (linesRes.success && linesRes.data) {
        const localOrder = await prisma.order.findUnique({ where: { externalId: order.id } });
        if (localOrder) {
          for (const line of linesRes.data) {
            await prisma.orderLine.upsert({
              where: { externalId: line.id },
              update: {
                product: line.product || "Unknown",
                size: line.size,
                style: line.style,
                quantity: line.units || 0,
              },
              create: {
                orderId: localOrder.id,
                externalId: line.id,
                product: line.product || "Unknown",
                size: line.size,
                style: line.style,
                quantity: line.units || 0,
              },
            });
          }
        }
      }

      pulled++;
    } catch (err) {
      console.error(`Failed to sync order ${order.id}:`, err);
    }
  }

  // Log sync
  await prisma.syncLog.create({
    data: { entityType: "order", direction: "PULL", recordCount: pulled },
  });

  return { success: true, pulled };
}
