"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getImpactOverview(supplierId?: number) {
  try {
    const where = supplierId ? { supplierId } : {};

    const records = await prisma.supplierImpact.count({ where });

    // If no records, return empty state
    if (records === 0) {
      return { totalRecords: 0, byCategory: [], bySupplier: [] };
    }

    // Use simple aggregation — avoid _count._all which varies by Prisma version
    const allRecords = await prisma.supplierImpact.findMany({
      where,
      select: { category: true, value: true, supplierId: true },
    });

    // Aggregate by category
    const catMap = new Map<string, { total: number; count: number }>();
    for (const r of allRecords) {
      const existing = catMap.get(r.category) || { total: 0, count: 0 };
      existing.total += r.value;
      existing.count += 1;
      catMap.set(r.category, existing);
    }
    const byCategory = Array.from(catMap.entries()).map(([category, { total, count }]) => ({
      category,
      totalValue: total,
      count,
    }));

    // Aggregate by supplier (admin only)
    let bySupplier: { supplierId: number; supplierName: string; totalValue: number; count: number }[] = [];

    if (!supplierId) {
      const supMap = new Map<number, { total: number; count: number }>();
      for (const r of allRecords) {
        const existing = supMap.get(r.supplierId) || { total: 0, count: 0 };
        existing.total += r.value;
        existing.count += 1;
        supMap.set(r.supplierId, existing);
      }

      if (supMap.size > 0) {
        const ids = Array.from(supMap.keys());
        const suppliers = await prisma.supplier.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        const supplierNames = new Map(suppliers.map((s) => [s.id, s.name]));

        bySupplier = Array.from(supMap.entries()).map(([id, { total, count }]) => ({
          supplierId: id,
          supplierName: supplierNames.get(id) || "Unknown",
          totalValue: total,
          count,
        }));
      }
    }

    return {
      totalRecords: records,
      byCategory,
      bySupplier,
    };
  } catch (error) {
    console.error("Impact overview error:", error);
    return { totalRecords: 0, byCategory: [], bySupplier: [] };
  }
}

export async function getSupplierImpactRecords(supplierId: number) {
  return prisma.supplierImpact.findMany({
    where: { supplierId },
    orderBy: { createdAt: "desc" },
    include: {
      productionRun: { select: { runCode: true } },
    },
  });
}

export async function createImpactRecord(data: {
  supplierId: number;
  productionRunId?: number | null;
  category: string;
  value: number;
  unit: string;
  dataQuality?: string;
  period?: string | null;
  notes?: string | null;
}) {
  try {
    const record = await prisma.supplierImpact.create({
      data: {
        supplierId: data.supplierId,
        productionRunId: data.productionRunId || null,
        category: data.category as "GHG" | "WATER" | "ENERGY" | "WASTE" | "LAND_USE" | "BIODIVERSITY",
        value: data.value,
        unit: data.unit,
        dataQuality: (data.dataQuality as "MEASURED" | "ESTIMATED" | "BENCHMARKED") || "ESTIMATED",
        period: data.period || null,
        notes: data.notes || null,
        status: "SUBMITTED",
      },
    });
    revalidatePath("/impact");
    return { success: true, data: record };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create record" };
  }
}

export async function reviewImpactRecord(id: number, status: "APPROVED" | "REJECTED", reviewerId: number) {
  try {
    await prisma.supplierImpact.update({
      where: { id },
      data: { status, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    revalidatePath("/impact");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to review" };
  }
}
