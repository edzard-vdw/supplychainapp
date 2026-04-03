import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/session";
import { redirect } from "next/navigation";
import { StockClient } from "./stock-client";

export default async function StockPage() {
  const session = await getSession();
  if (!isAdmin(session)) redirect("/production-runs");

  const [colours, deliveries] = await Promise.all([
    prisma.materialColor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { orderLines: true, garments: true } },
      },
    }),
    prisma.yarnDelivery.findMany({
      include: {
        supplier: { select: { id: true, name: true } },
        lines: {
          select: {
            colourCode: true,
            colourName: true,
            remainingKg: true,
            netKg: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <StockClient
      colours={JSON.parse(JSON.stringify(colours))}
      deliveries={JSON.parse(JSON.stringify(deliveries))}
    />
  );
}
