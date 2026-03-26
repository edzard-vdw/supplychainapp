"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getColourMap() {
  return prisma.colourMap.findMany({ orderBy: { sheepIncName: "asc" } });
}

export async function upsertColour(data: {
  millColourCode: string;
  millColourName?: string;
  sheepIncName: string;
  sheepIncCode?: string;
  hexValue?: string;
  yarnMill?: string;
}) {
  try {
    const colour = await prisma.colourMap.upsert({
      where: { millColourCode: data.millColourCode },
      update: {
        millColourName: data.millColourName || null,
        sheepIncName: data.sheepIncName,
        sheepIncCode: data.sheepIncCode || null,
        hexValue: data.hexValue || null,
        yarnMill: data.yarnMill || null,
      },
      create: {
        millColourCode: data.millColourCode,
        millColourName: data.millColourName || null,
        sheepIncName: data.sheepIncName,
        sheepIncCode: data.sheepIncCode || null,
        hexValue: data.hexValue || null,
        yarnMill: data.yarnMill || null,
      },
    });
    revalidatePath("/settings");
    return { success: true, data: colour };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save colour" };
  }
}

export async function bulkImportColours(rows: { millColourCode: string; millColourName?: string; sheepIncName: string; sheepIncCode?: string; hexValue?: string }[]) {
  let imported = 0;
  for (const row of rows) {
    try {
      await prisma.colourMap.upsert({
        where: { millColourCode: row.millColourCode },
        update: { millColourName: row.millColourName || null, sheepIncName: row.sheepIncName, sheepIncCode: row.sheepIncCode || null, hexValue: row.hexValue || null },
        create: { millColourCode: row.millColourCode, millColourName: row.millColourName || null, sheepIncName: row.sheepIncName, sheepIncCode: row.sheepIncCode || null, hexValue: row.hexValue || null },
      });
      imported++;
    } catch { /* skip duplicates */ }
  }
  revalidatePath("/settings");
  return { success: true, imported };
}

export async function resolveColourCode(millCode: string) {
  return prisma.colourMap.findUnique({ where: { millColourCode: millCode } });
}
