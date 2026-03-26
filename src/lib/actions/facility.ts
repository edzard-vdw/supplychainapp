"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getFacilityProfile(supplierId: number) {
  return prisma.facilityProfile.findUnique({
    where: { supplierId },
  });
}

export async function upsertFacilityProfile(supplierId: number, data: {
  energySource?: string | null;
  renewablePct?: number | null;
  annualEnergyKwh?: number | null;
  waterSource?: string | null;
  annualWaterL?: number | null;
  waterRecyclingPct?: number | null;
  wasteManagement?: string | null;
  annualWasteKg?: number | null;
  facilitySize?: number | null;
  employeeCount?: number | null;
  operatingHours?: string | null;
  notes?: string | null;
}) {
  try {
    const profile = await prisma.facilityProfile.upsert({
      where: { supplierId },
      update: data,
      create: { supplierId, ...data },
    });
    revalidatePath("/impact");
    return { success: true, data: profile };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save profile" };
  }
}

export async function getCertifications(supplierId: number) {
  return prisma.supplierCertification.findMany({
    where: { supplierId },
    orderBy: { validUntil: "desc" },
  });
}

export async function addCertification(supplierId: number, data: {
  name: string;
  certNumber?: string | null;
  issuedBy?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}) {
  try {
    const cert = await prisma.supplierCertification.create({
      data: {
        supplierId,
        name: data.name,
        certNumber: data.certNumber || null,
        issuedBy: data.issuedBy || null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes || null,
      },
    });
    revalidatePath("/impact");
    return { success: true, data: cert };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add certification" };
  }
}

export async function deleteCertification(id: number) {
  try {
    await prisma.supplierCertification.delete({ where: { id } });
    revalidatePath("/impact");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete" };
  }
}

/**
 * Get per-product impact derived from production run data.
 * Divides total run impact by quantity to get per-garment numbers.
 */
export async function getProductImpact(productionRunId: number) {
  const run = await prisma.productionRun.findUnique({
    where: { id: productionRunId },
    select: { quantity: true, productName: true, sku: true },
  });
  if (!run || run.quantity === 0) return null;

  const impacts = await prisma.supplierImpact.findMany({
    where: { productionRunId, scope: "PRODUCTION_RUN" },
  });

  return impacts.map((i) => ({
    category: i.category,
    totalValue: i.value,
    perGarment: i.value / run.quantity,
    unit: i.unit,
    dataQuality: i.dataQuality,
  }));
}

/**
 * Get all run-level impacts for DPP export.
 * Groups by production run and calculates per-garment values.
 */
export async function getDppExportData() {
  const runImpacts = await prisma.supplierImpact.findMany({
    where: { scope: "PRODUCTION_RUN", status: "APPROVED" },
    include: {
      productionRun: {
        select: {
          runCode: true,
          sku: true,
          productName: true,
          quantity: true,
          supplier: { select: { name: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by run
  const byRun = new Map<number, typeof runImpacts>();
  for (const impact of runImpacts) {
    if (!impact.productionRunId) continue;
    const existing = byRun.get(impact.productionRunId) || [];
    existing.push(impact);
    byRun.set(impact.productionRunId, existing);
  }

  return Array.from(byRun.entries()).map(([runId, impacts]) => {
    const run = impacts[0].productionRun;
    return {
      runId,
      runCode: run?.runCode || "Unknown",
      sku: run?.sku,
      productName: run?.productName,
      quantity: run?.quantity || 0,
      supplierName: run?.supplier?.name,
      supplierType: run?.supplier?.type,
      impacts: impacts.map((i) => ({
        category: i.category,
        totalValue: i.value,
        perGarment: run?.quantity ? i.value / run.quantity : 0,
        unit: i.unit,
        dataQuality: i.dataQuality,
      })),
    };
  });
}
