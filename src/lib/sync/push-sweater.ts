"use server";

import { prisma } from "@/lib/db";
import { apiPost } from "./sheep-api-client";

export async function pushSweater(garmentId: number): Promise<{ success: boolean; error?: string }> {
  const garment = await prisma.garment.findUnique({
    where: { id: garmentId },
    include: { productionRun: true },
  });

  if (!garment) return { success: false, error: "Garment not found" };
  if (!garment.productionRun?.externalId) return { success: false, error: "Production run has no external ID" };

  const res = await apiPost("/sweaters", {
    production_run_id: garment.productionRun.externalId,
    nfc_tag: garment.nfcTagId,
    qr_code: garment.qrCode,
    size: garment.size,
    style: garment.style,
    gps_lat: garment.lastLatitude,
    gps_long: garment.lastLongitude,
  });

  if (res.success) {
    const extData = res.data as { id?: number };
    if (extData?.id) {
      await prisma.garment.update({
        where: { id: garmentId },
        data: { externalId: extData.id, lastSyncAt: new Date() },
      });
    }

    await prisma.syncLog.create({
      data: { entityType: "garment", direction: "PUSH", recordCount: 1 },
    });
  }

  return { success: res.success, error: res.error };
}

export async function pushQrChange(garmentId: number, newQrCode: string): Promise<{ success: boolean; error?: string }> {
  const garment = await prisma.garment.findUnique({ where: { id: garmentId } });
  if (!garment) return { success: false, error: "Garment not found" };

  const res = await apiPost("/change-qr", {
    old_qr: garment.qrCode,
    new_qr: newQrCode,
  });

  return { success: res.success, error: res.error };
}
