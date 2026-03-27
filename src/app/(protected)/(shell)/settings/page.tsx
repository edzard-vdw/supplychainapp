import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await getSession();
  const isAdmin = session.role === "ADMIN";

  const [users, suppliers] = isAdmin
    ? await Promise.all([
        prisma.user.findMany({
          include: { supplier: { select: { id: true, name: true, type: true } } },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        }),
        prisma.supplier.findMany({
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, type: true },
        }),
      ])
    : [[], []];

  return (
    <SettingsClient
      isAdmin={isAdmin}
      currentUserId={session.userId}
      users={JSON.parse(JSON.stringify(users))}
      suppliers={suppliers}
    />
  );
}
