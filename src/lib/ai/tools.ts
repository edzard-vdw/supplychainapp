import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";

export const aiTools = {
  // ─── Orders ──────────────────────────────────────────
  getOrderSummary: tool({
    description: "Get a summary of all orders — count by status, total units. Use when asked about order overview or status.",
    inputSchema: z.object({}),
    execute: async () => {
      const orders = await prisma.order.findMany({
        include: { supplier: { select: { name: true } }, _count: { select: { orderLines: true } } },
      });
      const byStatus: Record<string, number> = {};
      let totalUnits = 0;
      for (const o of orders) {
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        totalUnits += o.totalQuantity;
      }
      return { totalOrders: orders.length, totalUnits, byStatus, orders: orders.map((o) => ({ ref: o.orderRef, status: o.status, units: o.totalQuantity, supplier: o.supplier?.name || "Unassigned", lines: o._count.orderLines })) };
    },
  }),

  getOrderDetails: tool({
    description: "Get details of a specific order by reference (PO number). Use when asked about a specific order.",
    inputSchema: z.object({ orderRef: z.string().describe("The order/PO reference number") }),
    execute: async ({ orderRef }) => {
      const order = await prisma.order.findFirst({
        where: { OR: [{ orderRef }, { orderRef: { contains: orderRef } }] },
        include: { supplier: true, orderLines: { include: { color: true, _count: { select: { productionRuns: true } } } } },
      });
      if (!order) return { error: `Order "${orderRef}" not found` };
      return { orderRef: order.orderRef, status: order.status, supplier: order.supplier?.name, client: order.client, totalQuantity: order.totalQuantity, dueDate: order.dueDate, lines: order.orderLines.map((l) => ({ product: l.product, style: l.style, size: l.size, quantity: l.quantity, costPrice: l.unitPrice, runs: l._count.productionRuns })) };
    },
  }),

  // ─── Production Runs ──────────────────────────────────
  getRunSummary: tool({
    description: "Get summary of all production runs — count by status, total units in production. Use for run overview.",
    inputSchema: z.object({}),
    execute: async () => {
      const runs = await prisma.productionRun.findMany({
        include: { supplier: { select: { name: true } }, _count: { select: { garments: true } } },
      });
      const byStatus: Record<string, number> = {};
      let totalUnits = 0; let totalTagged = 0;
      for (const r of runs) {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        totalUnits += r.quantity;
        totalTagged += r._count.garments;
      }
      return { totalRuns: runs.length, totalUnits, totalTagged, byStatus, runs: runs.map((r) => ({ code: r.runCode, status: r.status, product: r.productName, sku: r.sku, quantity: r.quantity, produced: r.unitsProduced, tagged: r._count.garments, supplier: r.supplier?.name || "Unassigned" })) };
    },
  }),

  getRunDetails: tool({
    description: "Get details of a specific production run by code. Use when asked about a specific run.",
    inputSchema: z.object({ runCode: z.string().describe("The production run code") }),
    execute: async ({ runCode }) => {
      const run = await prisma.productionRun.findFirst({
        where: { OR: [{ runCode }, { runCode: { contains: runCode } }] },
        include: { supplier: true, yarnCompositions: true, _count: { select: { garments: true } }, orderLine: { include: { order: { select: { orderRef: true } } } } },
      });
      if (!run) return { error: `Run "${runCode}" not found` };
      return { runCode: run.runCode, status: run.status, product: run.productName, sku: run.sku, quantity: run.quantity, produced: run.unitsProduced, tagged: run._count.garments, supplier: run.supplier?.name, order: run.orderLine?.order?.orderRef, config: { washing: run.washingProgram, temp: run.washingTemperature, gauge: run.machineGauge, ply: run.knitwearPly, stitch: run.stitchType }, yarns: run.yarnCompositions.map((y) => ({ type: y.yarnType, pct: y.percentage })), individualTagging: run.individualTagging };
    },
  }),

  // ─── Garments ──────────────────────────────────────────
  lookupGarment: tool({
    description: "Look up a garment by its code, NFC tag, or QR code. Use to check if a garment is registered and trace it.",
    inputSchema: z.object({ code: z.string().describe("Garment code, NFC tag, or QR value") }),
    execute: async ({ code }) => {
      const garment = await prisma.garment.findFirst({
        where: { OR: [{ garmentCode: code }, { nfcTagId: code }, { qrCode: code }, { garmentCode: { contains: code } }] },
        include: { color: true, productionRun: { include: { supplier: { select: { name: true } }, orderLine: { include: { order: { select: { orderRef: true } } } } } } },
      });
      if (!garment) return { found: false, message: `No garment found for "${code}"` };
      return { found: true, code: garment.garmentCode, product: garment.product, size: garment.size, colour: garment.color?.name, tagged: garment.isTagged, nfc: garment.nfcTagId, qr: garment.qrCode, run: garment.productionRun?.runCode, supplier: garment.productionRun?.supplier?.name, order: garment.productionRun?.orderLine?.order?.orderRef };
    },
  }),

  getGarmentStats: tool({
    description: "Get garment statistics — total, tagged, untagged, by status. Use for garment overview.",
    inputSchema: z.object({}),
    execute: async () => {
      const [total, tagged] = await Promise.all([
        prisma.garment.count(),
        prisma.garment.count({ where: { isTagged: true } }),
      ]);
      return { total, tagged, untagged: total - tagged, tagRate: total > 0 ? `${Math.round((tagged / total) * 100)}%` : "N/A" };
    },
  }),

  // ─── Suppliers ─────────────────────────────────────────
  getSupplierList: tool({
    description: "List all suppliers with their run/order counts. Use when asked about suppliers.",
    inputSchema: z.object({}),
    execute: async () => {
      const suppliers = await prisma.supplier.findMany({
        where: { isActive: true },
        include: { _count: { select: { productionRuns: true, orders: true } }, certifications: { select: { name: true } } },
      });
      return suppliers.map((s) => ({ name: s.name, type: s.type, country: s.country, runs: s._count.productionRuns, orders: s._count.orders, certs: s.certifications.map((c) => c.name) }));
    },
  }),

  // ─── Stock / Materials ─────────────────────────────────
  getStockLevels: tool({
    description: "Get material/yarn stock levels. Use when asked about stock, materials, or yarn availability.",
    inputSchema: z.object({}),
    execute: async () => {
      const materials = await prisma.materialColor.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
      const totalRemaining = materials.reduce((s, m) => s + m.remainingKg, 0);
      const totalInitial = materials.reduce((s, m) => s + m.stockWeightKg, 0);
      return { totalRemainingKg: Math.round(totalRemaining), totalInitialKg: Math.round(totalInitial), usedPct: totalInitial > 0 ? `${Math.round(((totalInitial - totalRemaining) / totalInitial) * 100)}%` : "N/A", materials: materials.map((m) => ({ name: m.name, remainingKg: m.remainingKg, initialKg: m.stockWeightKg, type: m.yarnType })) };
    },
  }),

  // ─── Impact ────────────────────────────────────────────
  getImpactSummary: tool({
    description: "Get impact data summary — totals by category across all suppliers. Use for sustainability/environmental queries.",
    inputSchema: z.object({}),
    execute: async () => {
      const records = await prisma.supplierImpact.findMany({ select: { category: true, value: true, unit: true, status: true } });
      const byCategory: Record<string, { total: number; unit: string; count: number }> = {};
      let pending = 0;
      for (const r of records) {
        if (!byCategory[r.category]) byCategory[r.category] = { total: 0, unit: r.unit, count: 0 };
        byCategory[r.category].total += r.value;
        byCategory[r.category].count++;
        if (r.status === "SUBMITTED") pending++;
      }
      return { totalRecords: records.length, pendingReview: pending, categories: Object.entries(byCategory).map(([cat, d]) => ({ category: cat, total: Math.round(d.total * 10) / 10, unit: d.unit, records: d.count })) };
    },
  }),

  // ─── General Queries ───────────────────────────────────
  searchEverything: tool({
    description: "Search across orders, runs, garments, and suppliers by a keyword. Use as a fallback when the user asks something vague.",
    inputSchema: z.object({ query: z.string().describe("Search keyword") }),
    execute: async ({ query }) => {
      const [orders, runs, garments, suppliers] = await Promise.all([
        prisma.order.findMany({ where: { OR: [{ orderRef: { contains: query } }, { client: { contains: query } }] }, take: 5, select: { orderRef: true, status: true, totalQuantity: true } }),
        prisma.productionRun.findMany({ where: { OR: [{ runCode: { contains: query } }, { productName: { contains: query } }, { sku: { contains: query } }] }, take: 5, select: { runCode: true, status: true, productName: true, quantity: true } }),
        prisma.garment.findMany({ where: { OR: [{ garmentCode: { contains: query } }, { nfcTagId: { contains: query } }, { qrCode: { contains: query } }] }, take: 5, select: { garmentCode: true, product: true, isTagged: true } }),
        prisma.supplier.findMany({ where: { name: { contains: query } }, take: 5, select: { name: true, type: true, country: true } }),
      ]);
      return { orders, runs, garments, suppliers, totalResults: orders.length + runs.length + garments.length + suppliers.length };
    },
  }),
};
