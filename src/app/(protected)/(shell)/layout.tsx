import { getSession } from "@/lib/session";
import { Shell } from "../shell";

export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <Shell
      user={{
        id: session.userId,
        email: session.email,
        name: session.name,
        role: session.role,
        supplierId: session.supplierId,
        supplierName: session.supplierName,
      }}
    >
      {children}
    </Shell>
  );
}
