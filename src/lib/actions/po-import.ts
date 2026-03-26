"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";

export interface POParseResult {
  header: {
    channel: string;
    parentPO: string;
    supplierName: string;
    date: string | null;
  };
  lines: {
    collection: string;
    appPo: string;
    style: string;
    styleCode: string;
    sku: string;
    productColor: string;
    product: string;
    size: string;
    orderQty: number;
    costPriceEur: number | null;
  }[];
  totalQty: number;
  skuCount: number;
}

function excelDateToISO(serial: number): string | null {
  if (!serial || serial < 1) return null;
  const epoch = new Date(1899, 11, 30);
  const d = new Date(epoch.getTime() + serial * 86400000);
  return d.toISOString().slice(0, 10);
}

/**
 * Parse a PO Excel file buffer (Sheep Inc format).
 */
export async function parsePOExcel(base64: string): Promise<POParseResult> {
  const buffer = Buffer.from(base64, "base64");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Parse header (rows 0-3)
  const header = {
    channel: String(data[0]?.[1] || ""),
    parentPO: String(data[1]?.[1] || ""),
    supplierName: String(data[2]?.[1] || ""),
    date: typeof data[3]?.[1] === "number" ? excelDateToISO(data[3][1]) : null,
  };

  // Find header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(data.length, 15); i++) {
    if (String(data[i]?.[0] || "").toLowerCase().includes("collection")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) throw new Error("Could not find column headers in PO file");

  // Parse line items with carry-forward
  const lines: POParseResult["lines"] = [];
  let cc = "", cap = "", cs = "", csc = "", cpc = "", cp = "";

  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    if (String(row[1] || "").trim().toUpperCase() === "TOTAL") continue;

    const sku = String(row[4] || "").trim();
    const sc = String(row[3] || "").trim();
    if (!sku && !sc) continue;

    if (row[0]) cc = String(row[0]).trim();
    if (row[1]) cap = String(row[1]).trim();
    if (row[2]) cs = String(row[2]).trim();
    if (row[3]) csc = String(row[3]).trim();
    if (row[5]) cpc = String(row[5]).trim();
    if (row[6]) cp = String(row[6]).trim();

    const qty = Number(row[8] || row[9] || 0);

    lines.push({
      collection: cc,
      appPo: cap,
      style: cs,
      styleCode: csc,
      sku: sku || `${csc}-${String(row[7] || "")}`,
      productColor: cpc,
      product: cp,
      size: String(row[7] || "").trim(),
      orderQty: qty,
      costPriceEur: row[10] ? Number(row[10]) : null,
    });
  }

  return {
    header,
    lines,
    totalQty: lines.reduce((sum, l) => sum + l.orderQty, 0),
    skuCount: new Set(lines.map((l) => l.sku)).size,
  };
}

/**
 * Import a parsed PO into the database.
 */
export async function importPO(parsed: POParseResult) {
  try {
    // Match supplier
    let supplierId: number | null = null;
    if (parsed.header.supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: {
          OR: [
            { name: parsed.header.supplierName },
            { name: { contains: parsed.header.supplierName } },
          ],
        },
      });
      if (supplier) supplierId = supplier.id;
    }

    const orderRef = parsed.header.parentPO || `PO-IMPORT-${Date.now()}`;
    const existing = await prisma.order.findUnique({ where: { orderRef } });
    if (existing) return { success: false, error: `Order ${orderRef} already exists` };

    const order = await prisma.order.create({
      data: {
        orderRef,
        status: "DRAFT",
        supplierId,
        client: parsed.header.channel || "Sheep Inc",
        totalQuantity: parsed.totalQty,
        dueDate: parsed.header.date ? new Date(parsed.header.date) : null,
        notes: `Imported from PO. Supplier: ${parsed.header.supplierName}`,
      },
    });

    let created = 0;
    for (const line of parsed.lines) {
      await prisma.orderLine.create({
        data: {
          orderId: order.id,
          product: `${line.style} - ${line.productColor}`,
          style: line.styleCode,
          size: line.size,
          quantity: line.orderQty,
          unitPrice: line.costPriceEur,
          notes: `SKU: ${line.sku} | Collection: ${line.collection} | Sub-PO: ${line.appPo}`,
        },
      });
      created++;
    }

    revalidatePath("/orders");
    return {
      success: true,
      data: {
        orderId: order.id,
        orderRef,
        supplierMatched: supplierId ? parsed.header.supplierName : null,
        supplierNotFound: supplierId ? null : parsed.header.supplierName,
        linesCreated: created,
        totalQty: parsed.totalQty,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed" };
  }
}

/**
 * Parse + import CSV PO lines into an existing order.
 */
export async function parsePOCsv(csvText: string) {
  const rows = csvText.trim().split("\n");
  if (rows.length < 2) return [];
  return rows.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
    return { product: cols[0] || "Unknown", size: cols[1], style: cols[2], quantity: parseInt(cols[3]) || 0, unitPrice: cols[4] ? parseFloat(cols[4]) : undefined };
  }).filter((l) => l.product !== "Unknown");
}

export async function importPOLines(orderId: number, poLines: { product: string; size?: string; style?: string; quantity: number; unitPrice?: number }[]) {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: "Order not found" };
    let created = 0, totalQty = 0;
    for (const line of poLines) {
      await prisma.orderLine.create({ data: { orderId, product: line.product, size: line.size || null, style: line.style || null, quantity: line.quantity, unitPrice: line.unitPrice || null } });
      created++; totalQty += line.quantity;
    }
    await prisma.order.update({ where: { id: orderId }, data: { totalQuantity: { increment: totalQty } } });
    revalidatePath("/orders");
    return { success: true, data: { created, totalQty } };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed" };
  }
}
