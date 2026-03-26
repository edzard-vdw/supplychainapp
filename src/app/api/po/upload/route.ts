import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parsePOExcel, importPO } from "@/lib/actions/po-import";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || session.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Parse
    const parsed = await parsePOExcel(base64);

    // Check if user wants preview or import
    const action = formData.get("action") as string;
    if (action === "preview") {
      return NextResponse.json({ success: true, data: parsed });
    }

    // Import
    const result = await importPO(parsed);
    return NextResponse.json(result);
  } catch (error) {
    console.error("PO upload error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
