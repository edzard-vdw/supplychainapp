"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface ParsedPOPdf {
  poNumber: string;
  supplierName: string;
  date: string | null;
  currency: string;
  terms: string;
  totalAmount: number;
  lines: {
    lineNo: number;
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    // Parsed from description
    productName: string;
    colour: string;
    size: string;
  }[];
}

/**
 * Parse a Sheep Inc PO PDF from extracted text.
 */
export async function parsePOPdfText(text: string): Promise<ParsedPOPdf> {
  const normalized = text.replace(/\s+/g, " ");

  // Extract PO number
  const poMatch = normalized.match(/Purchase\s+Order\s+No\.\s+(PO-\d+)/i);
  const poNumber = poMatch ? poMatch[1] : "";

  // Extract supplier name — "Purchase Order To: <name>"
  const supplierMatch = normalized.match(/Purchase\s+Order\s+To:\s+([A-Z][A-Za-z\s.]+?)(?=\s+[A-Z]{2,}\.\s|S\.C\.|LOC)/i);
  const supplierName = supplierMatch ? supplierMatch[1].trim() : "";

  // Extract date
  const dateMatch = normalized.match(/Date\s+(\d{2}\/\d{2}\/\d{4})/);
  let date: string | null = null;
  if (dateMatch) {
    const parts = dateMatch[1].split("/");
    date = `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  // Extract currency
  const currMatch = normalized.match(/Currency\s+(\w{3})/);
  const currency = currMatch ? currMatch[1] : "EUR";

  // Extract terms
  const termsMatch = normalized.match(/Terms\s+([\w\s%,]+?)(?=\s+Customer)/);
  const terms = termsMatch ? termsMatch[1].trim() : "";

  // Extract total
  const totalMatch = normalized.match(/Total\s+([\d,]+\.\d{2})/);
  const totalAmount = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, "")) : 0;

  // Extract line items
  // Pattern: lineNo SKU(may contain spaces from PDF line breaks) Description Item qty price disc% amount
  const lines: ParsedPOPdf["lines"] = [];

  // More flexible regex: line number, then SKU (letters/digits/dashes with possible spaces),
  // then description starting with "The", then "Item", then numbers
  const lineRegex = /(\d+)\s+([\w]+-[\w-]+(?:\s*[\w-]+)*?)\s+(The\s+[\w\s-]+?Size\s+\d+\s*-\s*[\w\s-]+?)\s+Item\s+([\d.]+)\s+([\d.]+)\s+[\d.]+%\s+([\d,.]+)/gi;
  let match;

  while ((match = lineRegex.exec(normalized)) !== null) {
    const lineNo = parseInt(match[1]);
    const rawSku = match[2].replace(/\s+/g, ""); // Remove spaces from split SKUs
    const description = match[3].trim();
    const quantity = parseFloat(match[4]);
    const unitPrice = parseFloat(match[5]);
    const amount = parseFloat(match[6].replace(/,/g, ""));

    // Parse product name, colour, and size from description
    // e.g. "The Rugby Polo - Fawn Brown Size 2 - Medium"
    const descMatch = description.match(/^(The\s+[\w\s]+?)\s*-\s*([\w\s]+?)\s*Size\s+(\d+)\s*-\s*([\w\s-]+)$/i);
    let productName = description;
    let colour = "";
    let size = "";

    if (descMatch) {
      productName = descMatch[1].trim();
      colour = descMatch[2].trim();
      size = `${descMatch[3]} - ${descMatch[4].trim()}`;
    }

    lines.push({
      lineNo,
      sku: rawSku,
      description,
      quantity,
      unitPrice,
      amount,
      productName,
      colour,
      size,
    });
  }

  return {
    poNumber,
    supplierName,
    date,
    currency,
    terms,
    totalAmount,
    lines,
  };
}

/**
 * Import a parsed PO PDF into the database.
 */
export async function importPOPdf(parsed: ParsedPOPdf) {
  try {
    if (!parsed.poNumber) return { success: false, error: "No PO number found" };

    // Check if exists
    const existing = await prisma.order.findUnique({ where: { orderRef: parsed.poNumber } });
    if (existing) return { success: false, error: `Order ${parsed.poNumber} already exists` };

    // Match supplier
    let supplierId: number | null = null;
    if (parsed.supplierName) {
      const supplier = await prisma.supplier.findFirst({
        where: { OR: [{ name: parsed.supplierName }, { name: { contains: parsed.supplierName } }] },
      });
      if (supplier) supplierId = supplier.id;
    }

    const totalQty = parsed.lines.reduce((s, l) => s + l.quantity, 0);

    const order = await prisma.order.create({
      data: {
        orderRef: parsed.poNumber,
        status: "DRAFT",
        supplierId,
        client: "Sheep Inc",
        totalQuantity: totalQty,
        dueDate: parsed.date ? new Date(parsed.date) : null,
        notes: `Imported from PO PDF. Supplier: ${parsed.supplierName}. Terms: ${parsed.terms}. Currency: ${parsed.currency}. Total: ${parsed.totalAmount}`,
      },
    });

    let created = 0;
    for (const line of parsed.lines) {
      await prisma.orderLine.create({
        data: {
          orderId: order.id,
          product: `${line.productName} - ${line.colour}`,
          style: line.sku,
          size: line.size,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          notes: `SKU: ${line.sku} | ${line.description}`,
        },
      });
      created++;
    }

    revalidatePath("/orders");
    return {
      success: true,
      data: {
        orderId: order.id,
        orderRef: parsed.poNumber,
        supplierMatched: supplierId ? parsed.supplierName : null,
        supplierNotFound: supplierId ? null : parsed.supplierName,
        linesCreated: created,
        totalQty,
        totalAmount: parsed.totalAmount,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed" };
  }
}
