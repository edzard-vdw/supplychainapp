import { notFound } from "next/navigation";
import { getProductionRun } from "@/lib/actions/production-runs";
import { getSession } from "@/lib/session";
import { RunDetailClient } from "./run-detail-client";

export default async function ProductionRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const id = parseInt(runId);
  if (isNaN(id)) notFound();

  const [run, session] = await Promise.all([
    getProductionRun(id),
    getSession(),
  ]);

  if (!run) notFound();

  return (
    <RunDetailClient
      run={JSON.parse(JSON.stringify(run))}
      role={session.role}
    />
  );
}
