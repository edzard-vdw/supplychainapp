"use server";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { randomBytes } from "crypto";
import { Role } from "@prisma/client";

// ─── Temp password generator ─────────────────────────────────────────────────
// 12 characters: mixed-case letters + digits, no ambiguous chars (0/O, 1/l/I)
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = ["en", "ro", "bg", "pt"] as const;

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email required").max(200),
  role: z.enum(["ADMIN", "SUPPLIER", "VIEWER"]),
  supplierId: z.number().int().positive().optional().nullable(),
  language: z.enum(SUPPORTED_LANGUAGES).optional().default("en"),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(200).optional(),
  language: z.enum(SUPPORTED_LANGUAGES).optional(),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getUsers() {
  return prisma.user.findMany({
    include: {
      supplier: { select: { id: true, name: true, type: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createUser(data: Record<string, unknown>) {
  try {
    const parsed = CreateUserSchema.parse(data);

    // Normalise email
    const email = parsed.email.toLowerCase().trim();

    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "A user with this email already exists" };
    }

    // Supplier users must be linked to a supplier
    if (parsed.role === "SUPPLIER" && !parsed.supplierId) {
      return { success: false, error: "Supplier accounts must be linked to a supplier" };
    }

    // Admins must NOT be linked to a supplier
    const supplierId = parsed.role === "ADMIN" ? null : (parsed.supplierId ?? null);

    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.name.trim(),
        role: parsed.role as Role,
        supplierId,
        language: parsed.language ?? "en",
        password: hashedPassword,
        isActive: true,
      },
      include: {
        supplier: { select: { id: true, name: true, type: true } },
      },
    });

    revalidatePath("/settings");
    return {
      success: true,
      data: {
        user: { ...user, password: undefined },
        tempPassword,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation error" };
    }
    console.error("createUser error:", error);
    return { success: false, error: "Failed to create user" };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateUser(id: number, data: Record<string, unknown>) {
  try {
    const parsed = UpdateUserSchema.parse(data);
    const updateData: Record<string, unknown> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name.trim();
    if (parsed.email !== undefined) updateData.email = parsed.email.toLowerCase().trim();
    if (parsed.language !== undefined) updateData.language = parsed.language;

    if (parsed.email) {
      const existing = await prisma.user.findFirst({
        where: { email: parsed.email.toLowerCase().trim(), NOT: { id } },
      });
      if (existing) {
        return { success: false, error: "Email already in use by another account" };
      }
    }

    const user = await prisma.user.update({ where: { id }, data: updateData });
    revalidatePath("/settings");
    return { success: true, data: user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0]?.message ?? "Validation error" };
    }
    return { success: false, error: "Failed to update user" };
  }
}

// ─── Activate / Deactivate ───────────────────────────────────────────────────

export async function deactivateUser(id: number, requestingUserId: number) {
  if (id === requestingUserId) {
    return { success: false, error: "You cannot deactivate your own account" };
  }
  try {
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to deactivate user" };
  }
}

export async function reactivateUser(id: number) {
  try {
    await prisma.user.update({ where: { id }, data: { isActive: true } });
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to reactivate user" };
  }
}

// ─── Set language ────────────────────────────────────────────────────────────

export async function setUserLanguage(id: number, language: string) {
  if (!SUPPORTED_LANGUAGES.includes(language as typeof SUPPORTED_LANGUAGES[number])) {
    return { success: false, error: "Unsupported language" };
  }
  try {
    // Just update the DB. getSession() reads language fresh from DB on every
    // page render, so no cookie manipulation is needed.
    await prisma.user.update({ where: { id }, data: { language } });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    console.error("setUserLanguage error:", e);
    return { success: false, error: "Failed to update language" };
  }
}

// ─── Reset password ──────────────────────────────────────────────────────────

export async function resetUserPassword(id: number) {
  try {
    const tempPassword = generateTempPassword();
    const hashedPassword = await hashPassword(tempPassword);
    await prisma.user.update({ where: { id }, data: { password: hashedPassword } });
    revalidatePath("/settings");
    return { success: true, data: { tempPassword } };
  } catch {
    return { success: false, error: "Failed to reset password" };
  }
}
