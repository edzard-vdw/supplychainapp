import { prisma } from "@/lib/db";
import { getSession, getSupplierFilter } from "@/lib/session";
import { getMaterials } from "@/lib/actions/materials";
import { OrdersClient } from "./orders-client";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ upload?: string }> }) {
  const session = await getSession();
  const supplierFilter = getSupplierFilter(session);
  const params = await searchParams;

  const [orders, materials, suppliers] = await Promise.all([
    prisma.order.findMany({
      where: supplierFilter,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { orderLines: true } },
      },
    }),
    getMaterials(),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    }),
  ]);

  return (
    <OrdersClient
      initialOrders={JSON.parse(JSON.stringify(orders))}
      materials={JSON.parse(JSON.stringify(materials))}
      suppliers={suppliers}
      isAdmin={session.role === "ADMIN"}
      showUploadOnLoad={params.upload === "true"}
    />
  );
}
