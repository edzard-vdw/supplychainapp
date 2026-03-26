import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrder } from "@/lib/actions/orders";
import { getMaterials } from "@/lib/actions/materials";
import { getOrderEditHistory } from "@/lib/actions/edit-log";
import { getSession } from "@/lib/session";
import { OrderDetailClient } from "./order-detail-client";

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const id = parseInt(orderId);
  if (isNaN(id)) notFound();

  const [order, materials, editHistory, session, suppliers, existingSeasons, existingTags] = await Promise.all([
    getOrder(id),
    getMaterials(),
    getOrderEditHistory(id),
    getSession(),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
    // Get unique seasons from existing orders for auto-suggest
    prisma.order.findMany({ where: { season: { not: null } }, select: { season: true }, distinct: ["season"] }),
    prisma.order.findMany({ where: { tags: { not: null } }, select: { tags: true } }),
  ]);

  if (!order) notFound();

  return (
    <OrderDetailClient
      order={JSON.parse(JSON.stringify(order))}
      materials={JSON.parse(JSON.stringify(materials))}
      suppliers={suppliers}
      editHistory={JSON.parse(JSON.stringify(editHistory))}
      userRole={session.role}
      userName={session.name}
      existingSeasons={[...new Set(existingSeasons.map((s) => s.season).filter(Boolean) as string[])]}
      existingTags={[...new Set(existingTags.flatMap((t) => (t.tags || "").split(",").map((x) => x.trim())).filter(Boolean))]}
    />
  );
}
