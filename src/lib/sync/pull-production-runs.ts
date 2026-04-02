"use server";

import { prisma } from "@/lib/db";
import { apiGet } from "./sheep-api-client";

interface LegacyProdRun {
  id: number;
  units_produced: number;
  input_units: number;
  status: string;
  washing_program: string | null;
  washing_temperature: number | null;
  finishing_method: string | null;
  machine_gauge: string | null;
  knitwear_ply: string | null;
  yarns: { name: string; percentage: number }[];
  order_line_id: number | null;
}

function mapRunStatus(status: string): string {
  const map: Record<string, string> = {
    completed: "COMPLETED",
    in_progress: "IN_PRODUCTION",
    planned: "PLANNED",
    qc: "QC",
    shipped: "SHIPPED",
  };
  return map[status?.toLowerCase()] || "PLANNED";
}

export async function pullProductionRuns(): Promise<{ success: boolean; pulled: number; error?: string }> {
  // We need to pull runs per order line — get all local order lines with externalIds
  const orderLines = await prisma.orderLine.findMany({
    where: { externalId: { not: null } },
    select: { id: true, externalId: true },
  });

  let pulled = 0;

  for (const line of orderLines) {
    if (!line.externalId) continue;

    const res = await apiGet<LegacyProdRun[]>(`/v2/order-lines/${line.externalId}/production-runs`);
    if (!res.success || !res.data) continue;

    for (const run of res.data) {
      try {
        const status = mapRunStatus(run.status) as "PLANNED" | "IN_PRODUCTION" | "QC" | "SHIPPED" | "COMPLETED";

        const localRun = await prisma.productionRun.upsert({
          where: { externalId: run.id },
          update: {
            status,
            unitsProduced: run.units_produced || 0,
            inputUnits: run.input_units || 0,
            washingProgram: run.washing_program,
            washingTemperature: run.washing_temperature,
            machineGauge: run.machine_gauge,
            knitwearPly: run.knitwear_ply,
            lastSyncAt: new Date(),
          },
          create: {
            runCode: `EXT-RUN-${run.id}`,
            externalId: run.id,
            orderLineId: line.id,
            status,
            quantity: run.units_produced || 0,
            unitsProduced: run.units_produced || 0,
            inputUnits: run.input_units || 0,
            washingProgram: run.washing_program,
            washingTemperature: run.washing_temperature,
            machineGauge: run.machine_gauge,
            knitwearPly: run.knitwear_ply,
            lastSyncAt: new Date(),
          },
        });

        // Sync yarn compositions
        if (run.yarns && run.yarns.length > 0) {
          await prisma.yarnComposition.deleteMany({ where: { productionRunId: localRun.id } });
          await prisma.yarnComposition.createMany({
            data: run.yarns.map((y) => ({
              productionRunId: localRun.id,
              yarnType: y.name,
              percentage: y.percentage,
            })),
          });
        }

        pulled++;
      } catch (err) {
        console.error(`Failed to sync run ${run.id}:`, err);
      }
    }
  }

  await prisma.syncLog.create({
    data: { entityType: "production_run", direction: "PULL", recordCount: pulled },
  });

  return { success: true, pulled };
}
