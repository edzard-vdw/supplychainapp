"use server";

import { prisma } from "@/lib/db";
import { apiGet } from "./sheep-api-client";

interface LegacySweater {
  id: number;
  nfc_tag: string | null;
  qr_code: string | null;
  size: string | null;
  color: string | null;
  color_code: string | null;
  style: string | null;
  traceability_url: string | null;
  gps_lat: number | null;
  gps_long: number | null;
  manufacturer: string | null;
  finisher: string | null;
  production_run_id: number | null;
}

export async function pullSweaters(): Promise<{ success: boolean; pulled: number; error?: string }> {
  // Pull sweaters per production run
  const runs = await prisma.productionRun.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true },
  });

  let pulled = 0;

  for (const run of runs) {
    if (!run.externalId) continue;

    const res = await apiGet<LegacySweater[]>(`/production-runs/${run.externalId}/sweaters`);
    if (!res.success || !res.data) continue;

    for (const sweater of res.data) {
      try {
        await prisma.garment.upsert({
          where: { externalId: sweater.id },
          update: {
            nfcTagId: sweater.nfc_tag,
            qrCode: sweater.qr_code,
            size: sweater.size,
            style: sweater.style,
            traceabilityUrl: sweater.traceability_url,
            lastLatitude: sweater.gps_lat,
            lastLongitude: sweater.gps_long,
            manufacturer: sweater.manufacturer,
            finisher: sweater.finisher,
            isTagged: !!(sweater.nfc_tag || sweater.qr_code),
            lastSyncAt: new Date(),
          },
          create: {
            garmentCode: `EXT-${sweater.id}`,
            externalId: sweater.id,
            productionRunId: run.id,
            nfcTagId: sweater.nfc_tag,
            qrCode: sweater.qr_code,
            size: sweater.size,
            style: sweater.style,
            traceabilityUrl: sweater.traceability_url,
            lastLatitude: sweater.gps_lat,
            lastLongitude: sweater.gps_long,
            manufacturer: sweater.manufacturer,
            finisher: sweater.finisher,
            isTagged: !!(sweater.nfc_tag || sweater.qr_code),
            taggedAt: sweater.nfc_tag || sweater.qr_code ? new Date() : null,
            lastSyncAt: new Date(),
          },
        });
        pulled++;
      } catch (err) {
        console.error(`Failed to sync sweater ${sweater.id}:`, err);
      }
    }
  }

  await prisma.syncLog.create({
    data: { entityType: "garment", direction: "PULL", recordCount: pulled },
  });

  return { success: true, pulled };
}
