"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const MaterialSchema = z.object({
  name: z.string().min(1, "Name is required"),
  colorCode: z.string().optional().nullable(),
  hexValue: z.string().optional().nullable(),
  yarnType: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  stockWeightKg: z.number().min(0).default(0),
  remainingKg: z.number().min(0).default(0),
});

export async function getMaterials() {
  return prisma.materialColor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { orderLines: true, garments: true } },
    },
  });
}

export async function getMaterial(id: number) {
  return prisma.materialColor.findUnique({
    where: { id },
    include: {
      _count: { select: { orderLines: true, garments: true } },
    },
  });
}

export async function createMaterial(data: z.infer<typeof MaterialSchema>) {
  try {
    const parsed = MaterialSchema.parse(data);
    const material = await prisma.materialColor.create({ data: parsed });
    revalidatePath("/materials");
    return { success: true, data: material };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create material";
    return { success: false, error: message };
  }
}

export async function updateMaterial(id: number, data: Partial<z.infer<typeof MaterialSchema>>) {
  try {
    const material = await prisma.materialColor.update({
      where: { id },
      data,
    });
    revalidatePath("/materials");
    return { success: true, data: material };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update material";
    return { success: false, error: message };
  }
}

export async function deleteMaterial(id: number) {
  try {
    await prisma.materialColor.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/materials");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete material";
    return { success: false, error: message };
  }
}
