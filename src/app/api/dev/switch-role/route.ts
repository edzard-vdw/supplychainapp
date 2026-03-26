import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

/**
 * DEV ONLY — switch between admin and supplier roles without re-logging in.
 * POST /api/dev/switch-role { role: "ADMIN" | "SUPPLIER", supplierId?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ success: false, error: "Not logged in" }, { status: 401 });
    }

    const { role, supplierId } = await request.json();

    if (role === "ADMIN") {
      session.role = "ADMIN";
      session.supplierId = null;
      session.supplierName = null;
      session.name = "Admin";
    } else if (role === "SUPPLIER" && supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, name: true },
      });
      if (!supplier) {
        return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
      }
      session.role = "SUPPLIER";
      session.supplierId = supplier.id;
      session.supplierName = supplier.name;
      session.name = supplier.name;
    } else {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    await session.save();
    return NextResponse.json({ success: true, data: { role: session.role, supplierId: session.supplierId, supplierName: session.supplierName } });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

/**
 * GET /api/dev/switch-role — returns available suppliers for the toggle
 */
export async function GET() {
  try {
    const session = await getSession();
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({
      success: true,
      data: {
        currentRole: session.role,
        currentSupplierId: session.supplierId,
        suppliers,
      },
    });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
