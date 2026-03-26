"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ParsedDeliveryNote {
  deliveryNoteRef: string;
  supplierName: string;
  yarnMill: string;
  deliveryDate: string | null;
  totalCones: number;
  totalNetKg: number;
  totalGrossKg: number;
  lines: {
    yarnType: string;
    colourCode: string;
    colourName: string;        // Mill name (e.g. "GREY 45") — draft name from Suedwolle
    sheepIncName: string | null; // Resolved Sheep Inc name from colour map (e.g. "Slate Grey")
    composition: string;
    lotNumber: string;
    prodLot: string;
    boxId: string;
    cones: number;
    grossKg: number;
    netKg: number;
    condKg: number;
  }[];
}

/**
 * Parse a Suedwolle delivery note from extracted text.
 * The PDF text is extracted client-side and passed here.
 */
export async function parseDeliveryNoteText(text: string): Promise<ParsedDeliveryNote> {
  // Normalize whitespace — pdfjs gives us multi-space separated text
  const normalized = text.replace(/\s+/g, " ");

  // Extract delivery note reference: "FI - 26005186" or "FI-26005186"
  let deliveryNoteRef = "";
  const dnMatch = normalized.match(/Delivery\s+Note\s*:\s*(FI\s*-\s*\d+)/i);
  if (dnMatch) deliveryNoteRef = dnMatch[1].replace(/\s+/g, ""); // "FI-26005186"
  if (!deliveryNoteRef) {
    const dnMatch2 = normalized.match(/Document\s+No\s*:\s*(\d+)/);
    if (dnMatch2) deliveryNoteRef = `FI-${dnMatch2[1]}`;
  }

  // Extract supplier name — appears after "MANTECO" or similar, before address
  let supplierName = "";
  const supplierMatch = normalized.match(/S\.p\.A\.\s+Via\s+del\s+Mosso[^A-Z]+([A-Z]{3,}[A-Z\s]*?)\s+\d/);
  if (supplierMatch) supplierName = supplierMatch[1].trim();
  if (!supplierName) {
    // Fallback: look for destination company
    const destMatch = normalized.match(/Place\s+of\s+destination\s*:\s*([A-Za-z\s]+)\(/);
    if (destMatch) supplierName = destMatch[1].trim();
  }

  // Extract date: "Date: 18.03.26"
  let deliveryDate: string | null = null;
  const dateMatch = normalized.match(/Date:\s*(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (dateMatch) {
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    deliveryDate = `${year}-${dateMatch[2]}-${dateMatch[1]}`;
  }

  const yarnMill = "Suedwolle Group";

  // Extract colour blocks: "Colour-No. : 8M1425 GREY 45"
  const yarnItems: ParsedDeliveryNote["lines"] = [];

  // Find all colour entries
  const colourMatches = [...normalized.matchAll(/Colour-No\.\s*:\s*(\w+)\s+([A-Z][A-Z\s\d]*?)(?=\s+Composition)/gi)];
  const compositionMatches = [...normalized.matchAll(/Composition\s*:\s*([\d%\s\w]+?)(?=\s+Make)/gi)];
  const yarnTypeMatches = [...normalized.matchAll(/(\d+\s+NM\s+[\d/\*]+\s+[A-Z][A-Z\s\d,.*]+?)(?=\s+Colour)/gi)];
  const subtotalMatches = [...normalized.matchAll(/Subtotal:\s+([\d\s.]+)/gi)];

  for (let idx = 0; idx < colourMatches.length; idx++) {
    const colourCode = colourMatches[idx][1].trim();
    const colourName = colourMatches[idx][2].trim();
    const composition = compositionMatches[idx] ? compositionMatches[idx][1].trim() : "";
    const yarnType = yarnTypeMatches[idx] ? yarnTypeMatches[idx][1].replace(/^\d+\s+/, "").trim() : "";

    // Parse subtotal: "boxes cones gross net cond" — e.g. "1 1 1.82 0.98 1.04"
    let cones = 0, grossKg = 0, netKg = 0, condKg = 0;
    if (subtotalMatches[idx]) {
      const nums = subtotalMatches[idx][1].trim().split(/\s+/).map(Number);
      if (nums.length >= 4) {
        cones = nums[1] || nums[0];
        grossKg = nums[nums.length - 3] || 0;
        netKg = nums[nums.length - 2] || 0;
        condKg = nums[nums.length - 1] || 0;
      }
    }

    // Extract Lot number from the data row that contains this colour code
    // The data row has: BoxPos BoxID Lot(10-digit) DyeLot(7-digit) ProdLot ColourRef ColourCode ColourName ...
    // Search the FULL text for a data row containing this colour code preceded by lot numbers
    const lotRegex = new RegExp(`(\\d{10})\\s+(\\d{7})\\s+(\\w{5,10})\\s+\\w+\\s+${colourCode}`);
    const lotMatch = normalized.match(lotRegex);
    const lotNumber = lotMatch ? lotMatch[2] : "";   // e.g. "6100085" — the Lot number
    const prodLot = lotMatch ? lotMatch[3] : "";     // e.g. "151096" or "D5243414"

    yarnItems.push({
      yarnType,
      colourCode,
      colourName,
      sheepIncName: null, // Will be resolved below
      composition,
      lotNumber,
      prodLot,
      boxId: "",
      cones: cones || 1,
      grossKg,
      netKg: condKg || netKg,    // Use conditioned weight as the primary kg value
      condKg,
    });
  }

  // Note: colour map lookup happens in the API route after parsing

  // Calculate totals
  const totalCones = yarnItems.reduce((s, l) => s + l.cones, 0);
  const totalNetKg = yarnItems.reduce((s, l) => s + l.netKg, 0);
  const totalGrossKg = yarnItems.reduce((s, l) => s + l.grossKg, 0);

  return {
    deliveryNoteRef: deliveryNoteRef || `DN-${Date.now()}`,
    supplierName,
    yarnMill,
    deliveryDate,
    totalCones,
    totalNetKg: Math.round(totalNetKg * 100) / 100,
    totalGrossKg: Math.round(totalGrossKg * 100) / 100,
    lines: yarnItems,
  };
}

/**
 * Import a parsed delivery note into the database.
 */
export async function importDeliveryNote(parsed: ParsedDeliveryNote, supplierId?: number) {
  try {
    // Check if already exists
    const existing = await prisma.yarnDelivery.findUnique({ where: { deliveryNoteRef: parsed.deliveryNoteRef } });
    if (existing) return { success: false, error: `Delivery note ${parsed.deliveryNoteRef} already exists` };

    // Match supplier if not provided
    let finalSupplierId = supplierId || null;
    if (!finalSupplierId && parsed.supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { OR: [{ name: parsed.supplierName }, { name: { contains: parsed.supplierName } }] },
      });
      if (supplier) finalSupplierId = supplier.id;
    }

    const delivery = await prisma.yarnDelivery.create({
      data: {
        deliveryNoteRef: parsed.deliveryNoteRef,
        supplierId: finalSupplierId,
        yarnMill: parsed.yarnMill,
        deliveryDate: parsed.deliveryDate ? new Date(parsed.deliveryDate) : null,
        totalCones: parsed.totalCones,
        totalNetKg: parsed.totalNetKg,
        totalGrossKg: parsed.totalGrossKg,
        status: "PENDING",
        lines: {
          create: parsed.lines.map((l) => ({
            yarnType: l.yarnType,
            colourCode: l.colourCode,
            colourName: l.colourName,
            composition: l.composition,
            lotNumber: l.lotNumber,
            prodLot: l.prodLot,
            boxId: l.boxId,
            cones: l.cones,
            grossKg: l.grossKg,
            netKg: l.netKg,
            condKg: l.condKg,
            remainingKg: l.condKg || l.netKg, // Start with conditioned weight
          })),
        },
      },
    });

    revalidatePath("/materials");
    return { success: true, data: { id: delivery.id, ref: delivery.deliveryNoteRef, linesCreated: parsed.lines.length } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed" };
  }
}

/**
 * Confirm a yarn delivery has been received.
 */
export async function confirmDelivery(deliveryId: number, userId: number) {
  try {
    await prisma.yarnDelivery.update({
      where: { id: deliveryId },
      data: { status: "CONFIRMED", confirmedDate: new Date(), confirmedBy: userId },
    });
    revalidatePath("/materials");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to confirm" };
  }
}

/**
 * Update a yarn delivery line (edit stock details).
 */
export async function updateYarnDeliveryLine(lineId: number, data: {
  colourCode?: string;
  colourName?: string;
  lotNumber?: string;
  cones?: number;
  netKg?: number;
  condKg?: number;
  remainingKg?: number;
  composition?: string;
  yarnType?: string;
}) {
  try {
    await prisma.yarnDeliveryLine.update({
      where: { id: lineId },
      data,
    });
    revalidatePath("/materials");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update" };
  }
}

/**
 * Get all deliveries for a supplier.
 */
export async function getYarnDeliveries(supplierId?: number) {
  return prisma.yarnDelivery.findMany({
    where: supplierId ? { supplierId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      lines: true,
      _count: { select: { lines: true } },
    },
  });
}
