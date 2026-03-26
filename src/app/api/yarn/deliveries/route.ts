import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getYarnDeliveries } from "@/lib/actions/yarn-deliveries";

export async function GET() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) return NextResponse.json({ success: false }, { status: 401 });

    const supplierId = session.role === "ADMIN" ? undefined : session.supplierId || undefined;
    const deliveries = await getYarnDeliveries(supplierId);

    return NextResponse.json({ success: true, data: JSON.parse(JSON.stringify(deliveries)) });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load deliveries" }, { status: 500 });
  }
}
