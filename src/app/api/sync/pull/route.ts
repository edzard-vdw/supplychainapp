import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { syncAll } from "@/lib/sync/sync-all";

export async function POST() {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const results = await syncAll();
    const totalPulled = results.reduce((sum, r) => sum + r.pulled, 0);
    const hasErrors = results.some((r) => !r.success);

    return NextResponse.json({
      success: !hasErrors,
      data: {
        totalPulled,
        results,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}
