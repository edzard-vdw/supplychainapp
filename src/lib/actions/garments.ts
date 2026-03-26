"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";

export async function getGarments(filters?: { isTagged?: boolean; colorId?: number; productionRunId?: number }) {
  return prisma.garment.findMany({
    where: {
      ...(filters?.isTagged !== undefined ? { isTagged: filters.isTagged } : {}),
      ...(filters?.colorId ? { colorId: filters.colorId } : {}),
      ...(filters?.productionRunId ? { productionRunId: filters.productionRunId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      color: { select: { name: true, hexValue: true } },
      productionRun: { select: { runCode: true, status: true } },
    },
  });
}

export async function getGarment(id: number) {
  return prisma.garment.findUnique({
    where: { id },
    include: {
      color: true,
      productionRun: { include: { orderLine: { include: { order: true } } } },
      qrHistory: { orderBy: { createdAt: "desc" } },
      scanEvents: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
}

/**
 * Look up a garment by any identifier: garment code, NFC tag, QR code.
 * Returns basic traceability info. Supplier can only see their own garments' full data.
 */
export async function lookupGarment(code: string) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const session = await getSession();
  if (!session.isLoggedIn) return null;

  // Search across all identifier fields
  const garment = await prisma.garment.findFirst({
    where: {
      OR: [
        { garmentCode: trimmed },
        { nfcTagId: trimmed },
        { qrCode: trimmed },
        { garmentCode: { contains: trimmed } },
      ],
    },
    include: {
      color: { select: { name: true, hexValue: true } },
      productionRun: {
        include: {
          supplier: { select: { id: true, name: true, country: true } },
          orderLine: { include: { order: { select: { orderRef: true, client: true } } } },
        },
      },
      scanEvents: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  return garment;
}

/**
 * Register an unrecognised tag to an existing production run
 */
export async function registerGarmentToRun(data: {
  code: string;
  productionRunId: number;
  isNfc?: boolean;
}) {
  try {
    const run = await prisma.productionRun.findUnique({ where: { id: data.productionRunId } });
    if (!run) return { success: false, error: "Production run not found" };

    const currentCount = await prisma.garment.count({ where: { productionRunId: data.productionRunId } });
    const garmentNumber = currentCount + 1;
    const garmentCode = `${run.runCode}-${String(garmentNumber).padStart(4, "0")}`;

    const garment = await prisma.garment.create({
      data: {
        garmentCode,
        productionRunId: data.productionRunId,
        product: run.productName,
        size: run.productSize,
        nfcTagId: data.isNfc ? data.code : null,
        qrCode: data.isNfc ? null : data.code,
        traceabilityUrl: `https://sheepinc.com/trace/${garmentCode}`,
        isTagged: true,
        taggedAt: new Date(),
      },
    });

    // Update run units produced
    await prisma.productionRun.update({
      where: { id: data.productionRunId },
      data: { unitsProduced: garmentNumber },
    });

    // Log scan event
    await prisma.scanEvent.create({
      data: {
        garmentId: garment.id,
        scanType: data.isNfc ? "NFC_WRITE" : "QR_SCAN",
        tagData: data.code,
      },
    });

    revalidatePath("/garments");
    return { success: true, data: garment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to register garment";
    return { success: false, error: message };
  }
}

export async function createGarment(data: {
  garmentCode: string;
  productionRunId?: number | null;
  colorId?: number | null;
  size?: string | null;
  style?: string | null;
  product?: string | null;
  nfcTagId?: string | null;
  qrCode?: string | null;
  manufacturer?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  try {
    const garment = await prisma.garment.create({
      data: {
        ...data,
        isTagged: !!(data.nfcTagId || data.qrCode),
        taggedAt: data.nfcTagId || data.qrCode ? new Date() : null,
        traceabilityUrl: data.qrCode ? `https://sheepinc.com/trace/${data.garmentCode}` : null,
        lastLatitude: data.latitude,
        lastLongitude: data.longitude,
        locationUpdatedAt: data.latitude ? new Date() : null,
      },
    });
    revalidatePath("/garments");
    return { success: true, data: garment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create garment";
    return { success: false, error: message };
  }
}

export async function tagGarment(id: number, tagData: { nfcTagId?: string; qrCode?: string; latitude?: number; longitude?: number }) {
  try {
    const garment = await prisma.garment.update({
      where: { id },
      data: {
        ...tagData,
        isTagged: true,
        taggedAt: new Date(),
        lastLatitude: tagData.latitude,
        lastLongitude: tagData.longitude,
        locationUpdatedAt: tagData.latitude ? new Date() : null,
      },
    });

    // Log scan event
    await prisma.scanEvent.create({
      data: {
        garmentId: id,
        scanType: tagData.nfcTagId ? "NFC_WRITE" : "QR_GENERATE",
        tagData: tagData.nfcTagId || tagData.qrCode || null,
        latitude: tagData.latitude,
        longitude: tagData.longitude,
      },
    });

    revalidatePath("/garments");
    return { success: true, data: garment };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to tag garment";
    return { success: false, error: message };
  }
}

export async function changeQrCode(garmentId: number, newQrCode: string, reason?: string) {
  try {
    const garment = await prisma.garment.findUnique({ where: { id: garmentId } });
    if (!garment) return { success: false, error: "Garment not found" };

    await prisma.$transaction([
      prisma.qrChangeLog.create({
        data: {
          garmentId,
          oldQrCode: garment.qrCode,
          newQrCode,
          reason: reason || null,
        },
      }),
      prisma.garment.update({
        where: { id: garmentId },
        data: { qrCode: newQrCode },
      }),
    ]);

    revalidatePath("/garments");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to change QR code";
    return { success: false, error: message };
  }
}

export async function updateGarmentFinisher(id: number, finisher: string) {
  try {
    await prisma.garment.update({ where: { id }, data: { finisher: finisher || null } });
    revalidatePath("/garments");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update finisher";
    return { success: false, error: message };
  }
}

export async function getGarmentStats() {
  const [total, tagged, bySize] = await Promise.all([
    prisma.garment.count(),
    prisma.garment.count({ where: { isTagged: true } }),
    prisma.garment.groupBy({ by: ["size"], _count: true, where: { size: { not: null } }, orderBy: { _count: { size: "desc" } } }),
  ]);

  // By colour — join with colour names
  const byColorRaw = await prisma.garment.groupBy({
    by: ["colorId"],
    _count: true,
    where: { colorId: { not: null } },
    orderBy: { _count: { colorId: "desc" } },
  });

  const colorIds = byColorRaw.map((c) => c.colorId).filter((id): id is number => id !== null);
  const colors = colorIds.length > 0
    ? await prisma.materialColor.findMany({ where: { id: { in: colorIds } }, select: { id: true, name: true, hexValue: true } })
    : [];
  const colorMap = new Map(colors.map((c) => [c.id, c]));

  const byColor = byColorRaw.map((c) => ({
    colorId: c.colorId,
    count: c._count,
    name: c.colorId ? colorMap.get(c.colorId)?.name || "Unknown" : "Unknown",
    hex: c.colorId ? colorMap.get(c.colorId)?.hexValue || null : null,
  }));

  return { total, tagged, untagged: total - tagged, byColor, bySize };
}
