"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SUPPLIER_TYPES = ["GROWER", "SCOURER", "SPINNER", "KNITTER", "FINISHER", "RETAILER", "OTHER"] as const;

const SupplierCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  type: z.enum(SUPPLIER_TYPES),
  country: z.string().max(100).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactEmail: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().email("Valid email required").nullable().optional()),
});

const SupplierUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(SUPPLIER_TYPES).optional(),
  country: z.string().max(100).nullable().optional(),
  contactName: z.string().max(100).nullable().optional(),
  contactEmail: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().email().nullable().optional()),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getSuppliers() {
  return prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createSupplier(data: Record<string, unknown>) {
  try {
    const parsed = SupplierCreateSchema.parse(data);

    const existing = await prisma.supplier.findUnique({ where: { name: parsed.name.trim() } });
    if (existing) {
      return { success: false, error: "A supplier with this name already exists" };
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.name.trim(),
        type: parsed.type,
        country: parsed.country ?? null,
        contactName: parsed.contactName ?? null,
        contactEmail: parsed.contactEmail ?? null,
        isActive: true,
      },
    });

    revalidatePath("/settings");
    return { success: true, data: supplier };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation error" };
    }
    console.error("createSupplier error:", error);
    return { success: false, error: "Failed to create supplier" };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateSupplier(id: number, data: Record<string, unknown>) {
  try {
    const parsed = SupplierUpdateSchema.parse(data);

    if (parsed.name) {
      const existing = await prisma.supplier.findFirst({
        where: { name: parsed.name.trim(), NOT: { id } },
      });
      if (existing) {
        return { success: false, error: "A supplier with this name already exists" };
      }
    }

    const supplier = await prisma.supplier.update({ where: { id }, data: parsed });
    revalidatePath("/settings");
    return { success: true, data: supplier };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation error" };
    }
    return { success: false, error: "Failed to update supplier" };
  }
}

// ─── Activate / Deactivate ───────────────────────────────────────────────────

export async function deactivateSupplier(id: number) {
  try {
    await prisma.supplier.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to deactivate supplier" };
  }
}

export async function reactivateSupplier(id: number) {
  try {
    await prisma.supplier.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to reactivate supplier" };
  }
}
