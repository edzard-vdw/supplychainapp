"use server";

import { prisma } from "@/lib/db";
import { apiGet } from "./sheep-api-client";

interface LegacyColor {
  id: number;
  code: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  initial_stock: number;
  remaining_stock: number;
  remaining_weight: number;
}

export async function pullColors(): Promise<{ success: boolean; pulled: number; error?: string }> {
  const res = await apiGet<LegacyColor[]>("/colors");
  if (!res.success || !res.data) return { success: false, pulled: 0, error: res.error };

  let pulled = 0;

  for (const color of res.data) {
    try {
      await prisma.materialColor.upsert({
        where: { externalId: color.id },
        update: {
          name: color.name,
          colorCode: color.code,
          yarnType: color.type,
          manufacturer: color.manufacturer,
          stockWeightKg: color.initial_stock || 0,
          remainingKg: color.remaining_weight || 0,
          lastSyncAt: new Date(),
        },
        create: {
          name: color.name || `Color-${color.id}`,
          externalId: color.id,
          colorCode: color.code,
          yarnType: color.type,
          manufacturer: color.manufacturer,
          stockWeightKg: color.initial_stock || 0,
          remainingKg: color.remaining_weight || 0,
          lastSyncAt: new Date(),
        },
      });
      pulled++;
    } catch (err) {
      console.error(`Failed to sync color ${color.id}:`, err);
    }
  }

  await prisma.syncLog.create({
    data: { entityType: "color", direction: "PULL", recordCount: pulled },
  });

  return { success: true, pulled };
}
