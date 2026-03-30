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
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            country: true,
            contactName: true,
            contactEmail: true,
            isActive: true,
            _count: { select: { users: true } },
          },
        }),
      ])
    : [[], []];

  return (
    <SettingsClient
      isAdmin={isAdmin}
      currentUserId={session.userId}
      users={JSON.parse(JSON.stringify(users))}
      suppliers={JSON.parse(JSON.stringify(suppliers))}
    />
  );
}
