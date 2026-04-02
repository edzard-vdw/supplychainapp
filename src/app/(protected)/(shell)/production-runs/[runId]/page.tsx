import { notFound } from "next/navigation";
import { getProductionRun } from "@/lib/actions/production-runs";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
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

  // Fetch order lines with colors so the client can derive colour groups
  const orderLines = run.orderId
    ? await prisma.orderLine.findMany({
        where: { orderId: run.orderId },
        select: {
          id: true,
          colorId: true,
          size: true,
          quantity: true,
          color: { select: { name: true, hexValue: true } },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <RunDetailClient
      run={JSON.parse(JSON.stringify(run))}
      orderLines={JSON.parse(JSON.stringify(orderLines))}
      role={session.role}
    />
  );
}
