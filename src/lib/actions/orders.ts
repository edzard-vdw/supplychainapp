"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const OrderSchema = z.object({
  orderRef: z.string().min(1, "Order ref is required"),
  status: z.enum(["DRAFT", "CONFIRMED", "IN_PRODUCTION", "QC", "SHIPPED", "DELIVERED", "CANCELLED"]).optional().default("DRAFT"),
  supplierId: z.number().int().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  client: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  totalQuantity: z.number().int().min(0).optional().default(0),
  priority: z.number().int().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
});

const OrderLineSchema = z.object({
  orderId: z.number().int(),
  product: z.string().min(1, "Product is required"),
  colorId: z.number().int().optional().nullable(),
  size: z.string().optional().nullable(),
  style: z.string().optional().nullable(),
  quantity: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getOrders() {
  return prisma.order.findMany({
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { orderLines: true } },
    },
  });
}

export async function getOrder(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      orderLines: {
        include: {
          color: true,
          _count: { select: { productionRuns: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function createOrder(data: Record<string, unknown>) {
  try {
    const parsed = OrderSchema.parse(data);
    const order = await prisma.order.create({
      data: {
        ...parsed,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      },
    });
    revalidatePath("/orders");
    return { success: true, data: order };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    return { success: false, error: message };
  }
}

export async function updateOrder(id: number, data: Record<string, unknown>) {
  try {
    if (data.dueDate && typeof data.dueDate === "string") {
      data.dueDate = new Date(data.dueDate);
    }
    const order = await prisma.order.update({ where: { id }, data });
    revalidatePath("/orders");
    return { success: true, data: order };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update order";
    return { success: false, error: message };
  }
}

export async function deleteOrder(id: number) {
  try {
    await prisma.order.delete({ where: { id } });
    revalidatePath("/orders");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return { success: false, error: message };
  }
}

export async function createOrderLine(data: z.infer<typeof OrderLineSchema>) {
  try {
    const parsed = OrderLineSchema.parse(data);
    const line = await prisma.orderLine.create({ data: parsed });
    revalidatePath("/orders");
    return { success: true, data: line };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create order line";
    return { success: false, error: message };
  }
}

export async function updateOrderLine(id: number, data: Record<string, unknown>) {
  try {
    const line = await prisma.orderLine.update({ where: { id }, data });
    revalidatePath("/orders");
    return { success: true, data: line };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update order line";
    return { success: false, error: message };
  }
}

export async function deleteOrderLine(id: number) {
  try {
    await prisma.orderLine.delete({ where: { id } });
    revalidatePath("/orders");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete order line";
    return { success: false, error: message };
  }
}

// ─── Accept job: acknowledge order + auto-create production run ──────────────
export async function acceptJobAndCreateRun(orderId: number): Promise<{ success: boolean; runId?: number; error?: string }> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderLines: true },
    });
    if (!order) return { success: false, error: "Order not found" };
    if (order.status !== "CONFIRMED") return { success: false, error: "Order is not in CONFIRMED state" };

    // Generate unique run code
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const count = await prisma.productionRun.count({
      where: { runCode: { startsWith: `RUN-${dateStr}` } },
    });
    const runCode = `RUN-${dateStr}-${String(count + 1).padStart(3, "0")}`;

    // Derive product summary from first order line
    const firstLine = order.orderLines[0];
    const productName = firstLine?.product ?? null;
    const totalQty = order.orderLines.reduce((s, l) => s + l.quantity, 0);

    // Acknowledge order + create run in a transaction
    const [, run] = await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: "ACKNOWLEDGED" },
      }),
      prisma.productionRun.create({
        data: {
          runCode,
          orderId,
          supplierId: order.supplierId!,
          status: "PLANNED",
          quantity: totalQty,
          productName,
          // startDate is set automatically when moved to IN_PRODUCTION
          sizeBreakdown: {
            create: order.orderLines.map((line) => ({
              orderLineId: line.id,
              size: line.size ?? "",
              sku: line.style ?? null,
              quantity: line.quantity,
              produced: 0,
            })),
          },
        },
      }),
    ]);

    revalidatePath("/production-runs");
    revalidatePath("/orders");
    return { success: true, runId: run.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to accept job";
    return { success: false, error: message };
  }
}
