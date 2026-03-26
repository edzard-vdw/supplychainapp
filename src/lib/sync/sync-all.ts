"use server";

import { pullOrders } from "./pull-orders";
import { pullColors } from "./pull-colors";
import { pullProductionRuns } from "./pull-production-runs";
import { pullSweaters } from "./pull-sweaters";

export interface SyncResult {
  entity: string;
  success: boolean;
  pulled: number;
  error?: string;
}

export async function syncAll(): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  // Sync in dependency order: colors → orders → production runs → sweaters
  const colorsResult = await pullColors();
  results.push({ entity: "colors", ...colorsResult });

  const ordersResult = await pullOrders();
  results.push({ entity: "orders", ...ordersResult });

  const runsResult = await pullProductionRuns();
  results.push({ entity: "production_runs", ...runsResult });

  const sweatersResult = await pullSweaters();
  results.push({ entity: "garments", ...sweatersResult });

  return results;
}
