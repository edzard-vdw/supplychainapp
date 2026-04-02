"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { z } from "zod";

const RunSchema = z.object({
  runCode: z.string().optional().default("AUTO"),
  orderId: z.number().int().optional().nullable(),
  orderLineId: z.number().int().optional().nullable(),
  supplierId: z.number().int().optional().nullable(),
  status: z.enum(["PLANNED", "IN_PRODUCTION", "QC", "SHIPPED", "RECEIVED", "COMPLETED"]).optional().default("PLANNED"),
  quantity: z.number().int().min(0).optional().default(0),
  sku: z.string().optional().nullable(),
  productName: z.string().optional().nullable(),
  productColor: z.string().optional().nullable(),
  productSize: z.string().optional().nullable(),
  yarnColourCode: z.string().optional().nullable(),
  yarnLotNumber: z.string().optional().nullable(),
  individualTagging: z.boolean().optional().default(false),
  washingProgram: z.string().optional().nullable(),
  washingTemperature: z.number().optional().nullable(),
  machineGauge: z.string().optional().nullable(),
  knitwearPly: z.string().optional().nullable(),
  stitchType: z.string().optional().nullable(),
  finisherName: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  expectedExFactory: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function getProductionRuns(orderLineId?: number) {
  return prisma.productionRun.findMany({
    where: orderLineId ? { orderLineId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      order: { select: { orderRef: true } },
      orderLine: { include: { order: { select: { orderRef: true } }, color: { select: { name: true, hexValue: true } } } },
      sizeBreakdown: { orderBy: { size: "asc" } },
      yarnCompositions: true,
      _count: { select: { garments: true } },
    },
  });
}

export async function getProductionRun(id: number) {
  return prisma.productionRun.findUnique({
    where: { id },
    include: {
      order: { select: { id: true, orderRef: true, client: true, dueDate: true } },
      orderLine: { include: { order: true, color: true } },
      sizeBreakdown: { orderBy: { size: "asc" } },
      yarnCompositions: true,
      garments: { take: 50, orderBy: { createdAt: "desc" } },
      _count: { select: { garments: true } },
    },
  });
}

/**
 * Generate a unique run code: RUN-YYYYMMDD-NNN
 */
export async function generateRunCode(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `RUN-${dateStr}-`;

  // Find the highest number for today
  const latest = await prisma.productionRun.findFirst({
    where: { runCode: { startsWith: prefix } },
    orderBy: { runCode: "desc" },
    select: { runCode: true },
  });

  let nextNum = 1;
  if (latest) {
    const lastNum = parseInt(latest.runCode.replace(prefix, ""));
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function createProductionRun(
  data: Record<string, unknown>,
  yarns?: { yarnType: string; percentage: number }[],
  sizes?: { size: string; sku?: string; quantity: number; orderLineId?: number }[],
) {
  try {
    const parsed = RunSchema.parse(data);

    // Auto-generate run code if not provided or empty
    let runCode = parsed.runCode;
    if (!runCode || runCode === "AUTO") {
      runCode = await generateRunCode();
    }

    // If sizes provided, calculate total quantity
    const totalQty = sizes && sizes.length > 0
      ? sizes.reduce((sum, s) => sum + s.quantity, 0)
      : parsed.quantity || 0;

    const run = await prisma.productionRun.create({
      data: {
        ...parsed,
        runCode,
        quantity: totalQty,
        startDate: parsed.startDate ? new Date(parsed.startDate) : null,
        expectedExFactory: parsed.expectedExFactory ? new Date(parsed.expectedExFactory) : null,
        yarnCompositions: yarns && yarns.length > 0 ? { create: yarns } : undefined,
        sizeBreakdown: sizes && sizes.length > 0 ? {
          create: sizes.map((s) => ({
            size: s.size,
            sku: s.sku || null,
            quantity: s.quantity,
            orderLineId: s.orderLineId || null,
          })),
        } : undefined,
      },
    });
    revalidatePath("/production-runs");
    return { success: true, data: run };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create production run";
    return { success: false, error: message };
  }
}

export async function updateProductionRun(id: number, data: Record<string, unknown>) {
  try {
    if (data.startDate && typeof data.startDate === "string") data.startDate = new Date(data.startDate as string);
    if (data.expectedExFactory && typeof data.expectedExFactory === "string") data.expectedExFactory = new Date(data.expectedExFactory as string);
    if (data.actualCompletion && typeof data.actualCompletion === "string") data.actualCompletion = new Date(data.actualCompletion as string);
    if (data.finishedDate && typeof data.finishedDate === "string") data.finishedDate = new Date(data.finishedDate as string);

    // Validate status transitions if status is being changed
    if (data.status) {
      const session = await getSession();
      const current = await prisma.productionRun.findUnique({ where: { id }, select: { status: true, supplierId: true } });
      if (current) {
        const { getAllowedTransitions } = await import("@/types/supply-chain");
        const allowed = getAllowedTransitions(current.status, session.role);
        if (!allowed.includes(data.status as string)) {
          return { success: false, error: `Cannot move from ${current.status} to ${data.status} with role ${session.role}` };
        }
        // Verify supplier owns this run
        if (session.role === "SUPPLIER" && current.supplierId !== session.supplierId) {
          return { success: false, error: "Not your production run" };
        }
      }
    }

    const run = await prisma.productionRun.update({ where: { id }, data });
    revalidatePath("/production-runs");
    return { success: true, data: run };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update run";
    return { success: false, error: message };
  }
}

export async function deleteProductionRun(id: number) {
  try {
    await prisma.productionRun.delete({ where: { id } });
    revalidatePath("/production-runs");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete run";
    return { success: false, error: message };
  }
}

/**
 * Scan a garment into a production run (individual tagging mode).
 * Creates a new Garment record linked to this run, with NFC/QR tag.
 * Returns the tally (e.g. "23/100").
 */
export async function scanGarmentIntoRun(runId: number, tagData: {
  nfcTagId?: string;
  qrCode?: string;
  latitude?: number;
  longitude?: number;
  sizeBreakdownId?: number; // Which size within the run
}) {
  try {
    const run = await prisma.productionRun.findUnique({
      where: { id: runId },
      include: { sizeBreakdown: true },
    });
    if (!run) return { success: false, error: "Run not found" };
    if (!run.individualTagging) return { success: false, error: "This run does not use individual tagging" };

    // Determine size from breakdown if available
    let garmentSize = run.productSize;
    let sizeBreakdown = null;
    if (tagData.sizeBreakdownId && run.sizeBreakdown.length > 0) {
      sizeBreakdown = run.sizeBreakdown.find((sb) => sb.id === tagData.sizeBreakdownId);
      if (sizeBreakdown) garmentSize = sizeBreakdown.size;
    }

    // Check if tag already exists
    if (tagData.nfcTagId) {
      const existing = await prisma.garment.findUnique({ where: { nfcTagId: tagData.nfcTagId } });
      if (existing) return { success: false, error: `NFC tag already linked to garment ${existing.garmentCode}` };
    }
    if (tagData.qrCode) {
      const existing = await prisma.garment.findUnique({ where: { qrCode: tagData.qrCode } });
      if (existing) return { success: false, error: `QR code already linked to garment ${existing.garmentCode}` };
    }

    // Count existing garments in this run
    const currentCount = await prisma.garment.count({ where: { productionRunId: runId } });
    const garmentNumber = currentCount + 1;
    const garmentCode = `${run.runCode}-${String(garmentNumber).padStart(4, "0")}`;

    // Create garment with resolved size
    const garment = await prisma.garment.create({
      data: {
        garmentCode,
        productionRunId: runId,
        product: run.productName,
        size: garmentSize || run.productSize,
        nfcTagId: tagData.nfcTagId || null,
        qrCode: tagData.qrCode || null,
        traceabilityUrl: `https://sheepinc.com/trace/${garmentCode}`,
        isTagged: true,
        taggedAt: new Date(),
        lastLatitude: tagData.latitude || null,
        lastLongitude: tagData.longitude || null,
        locationUpdatedAt: tagData.latitude ? new Date() : null,
      },
    });

    // Log scan event
    await prisma.scanEvent.create({
      data: {
        garmentId: garment.id,
        scanType: tagData.nfcTagId ? "NFC_WRITE" : "QR_SCAN",
        tagData: tagData.nfcTagId || tagData.qrCode || null,
        latitude: tagData.latitude || null,
        longitude: tagData.longitude || null,
      },
    });

    // Update units produced on run
    await prisma.productionRun.update({
      where: { id: runId },
      data: { unitsProduced: garmentNumber },
    });

    // Update size breakdown produced count if applicable
    if (sizeBreakdown) {
      await prisma.runSizeBreakdown.update({
        where: { id: sizeBreakdown.id },
        data: { produced: { increment: 1 } },
      });
    }

    // Decrement yarn stock if run is linked to a yarn lot
    if (run.yarnLotNumber && run.yarnColourCode) {
      // Find the delivery line matching this colour code + lot
      const yarnLine = await prisma.yarnDeliveryLine.findFirst({
        where: { colourCode: run.yarnColourCode, lotNumber: run.yarnLotNumber, remainingKg: { gt: 0 } },
      });
      if (yarnLine && run.quantity > 0) {
        // Calculate per-garment yarn usage: total yarn / planned quantity
        const perGarmentKg = (yarnLine.condKg ?? yarnLine.netKg) / run.quantity;
        if (perGarmentKg > 0) {
          await prisma.yarnDeliveryLine.update({
            where: { id: yarnLine.id },
            data: { remainingKg: { decrement: Math.min(perGarmentKg, yarnLine.remainingKg) } },
          });
        }
      }
    }

    revalidatePath("/production-runs");
    revalidatePath("/materials");
    return {
      success: true,
      data: {
        garment,
        tally: `${garmentNumber}/${run.quantity}`,
        garmentNumber,
        total: run.quantity,
        size: garmentSize || undefined,
        sizeBreakdownId: sizeBreakdown?.id,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to scan garment";
    return { success: false, error: message };
  }
}

/**
 * Generate a batch QR/NFC tag for an entire production run (bulk mode).
 */
export async function generateBatchTag(runId: number, type: "qr" | "nfc", tagValue?: string) {
  try {
    const run = await prisma.productionRun.findUnique({ where: { id: runId } });
    if (!run) return { success: false, error: "Run not found" };

    const value = tagValue || `BATCH-${run.runCode}-${Date.now()}`;

    await prisma.productionRun.update({
      where: { id: runId },
      data: type === "qr"
        ? { batchQrCode: value }
        : { batchNfcTag: value },
    });

    revalidatePath("/production-runs");
    return { success: true, data: { type, value } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to generate tag";
    return { success: false, error: message };
  }
}

/**
 * Start production for a planned run.
 * If selectedColorIds is null → move entire run to IN_PRODUCTION.
 * If specific colors → create a new IN_PRODUCTION run for those colors; keep original PLANNED with remainder.
 */
export async function startProduction(
  runId: number,
  data: {
    selectedColorIds: number[] | null; // null = all colors
    yarnColourCode: string | null;     // e.g. "MER-NAVY" — colour code from delivery line
    yarnLotNumber: string | null;      // e.g. "6200145" — lot number from delivery line
    machineGauge: string | null;
    knitwearPly: string | null;
    stitchType: string | null;
    washingProgram: string | null;
    washingTemperature: number | null;
    expectedExFactory: string | null;
  }
): Promise<{ success: boolean; runId?: number; error?: string }> {
  try {
    const run = await prisma.productionRun.findUnique({
      where: { id: runId },
      include: { sizeBreakdown: true },
    });
    if (!run) return { success: false, error: "Run not found" };
    if (run.status !== "PLANNED") return { success: false, error: "Run is not in PLANNED state" };

    const manufacturingData = {
      yarnColourCode: data.yarnColourCode ?? null,
      yarnLotNumber: data.yarnLotNumber ?? null,
      machineGauge: data.machineGauge ?? null,
      knitwearPly: data.knitwearPly ?? null,
      stitchType: data.stitchType ?? null,
      washingProgram: data.washingProgram ?? null,
      washingTemperature: data.washingTemperature ?? null,
      expectedExFactory: data.expectedExFactory ? new Date(data.expectedExFactory) : null,
      startDate: new Date(),
      status: "IN_PRODUCTION" as const,
    };

    // If all colors → just update the current run
    if (!data.selectedColorIds) {
      await prisma.productionRun.update({ where: { id: runId }, data: manufacturingData });
      revalidatePath("/production-runs");
      return { success: true, runId };
    }

    // Specific colors → split the run
    // Fetch orderLine colors for each sizeBreakdown
    const orderLineIds = run.sizeBreakdown
      .filter((sb) => sb.orderLineId !== null)
      .map((sb) => sb.orderLineId!);

    const orderLines = await prisma.orderLine.findMany({
      where: { id: { in: orderLineIds } },
      select: { id: true, colorId: true },
    });

    const lineColorMap = new Map(orderLines.map((l) => [l.id, l.colorId]));

    const selectedBreakdowns = run.sizeBreakdown.filter((sb) => {
      const colorId = sb.orderLineId ? lineColorMap.get(sb.orderLineId) : null;
      return colorId !== null && colorId !== undefined && data.selectedColorIds!.includes(colorId);
    });
    const remainingBreakdowns = run.sizeBreakdown.filter((sb) => {
      const colorId = sb.orderLineId ? lineColorMap.get(sb.orderLineId) : null;
      return !colorId || !data.selectedColorIds!.includes(colorId);
    });

    if (selectedBreakdowns.length === 0) {
      return { success: false, error: "No breakdowns found for selected colors" };
    }

    // Create new IN_PRODUCTION run for selected colors
    const newRunCode = await generateRunCode();
    const newQuantity = selectedBreakdowns.reduce((s, sb) => s + sb.quantity, 0);

    const newRun = await prisma.productionRun.create({
      data: {
        runCode: newRunCode,
        orderId: run.orderId,
        orderLineId: run.orderLineId,
        supplierId: run.supplierId,
        productName: run.productName,
        quantity: newQuantity,
        individualTagging: true,
        ...manufacturingData,
        sizeBreakdown: {
          create: selectedBreakdowns.map((sb) => ({
            size: sb.size,
            sku: sb.sku,
            quantity: sb.quantity,
            produced: sb.produced,
            orderLineId: sb.orderLineId,
          })),
        },
      },
    });

    // Remove moved breakdowns from original; update original quantity
    await prisma.$transaction([
      prisma.runSizeBreakdown.deleteMany({
        where: { id: { in: selectedBreakdowns.map((sb) => sb.id) } },
      }),
      prisma.productionRun.update({
        where: { id: runId },
        data: { quantity: remainingBreakdowns.reduce((s, sb) => s + sb.quantity, 0) },
      }),
    ]);

    revalidatePath("/production-runs");
    return { success: true, runId: newRun.id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to start production";
    return { success: false, error: message };
  }
}

export async function updateYarnCompositions(runId: number, yarns: { yarnType: string; percentage: number }[]) {
  try {
    await prisma.$transaction([
      prisma.yarnComposition.deleteMany({ where: { productionRunId: runId } }),
      ...yarns.map((y) => prisma.yarnComposition.create({ data: { productionRunId: runId, ...y } })),
    ]);
    revalidatePath("/production-runs");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update yarn composition";
    return { success: false, error: message };
  }
}
