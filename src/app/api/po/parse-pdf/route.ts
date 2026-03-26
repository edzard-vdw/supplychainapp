import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parsePOPdfText } from "@/lib/actions/po-pdf-parser";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpFile = join(tmpdir(), `po-${Date.now()}.pdf`);
    writeFileSync(tmpFile, buffer);

    try {
      const scriptPath = join(process.cwd(), "scripts", "extract-pdf.mjs");
      const result = execSync(`node "${scriptPath}" "${tmpFile}"`, {
        timeout: 15000,
        encoding: "utf-8",
        maxBuffer: 5 * 1024 * 1024,
      });

      const { text } = JSON.parse(result);

      if (!text || text.trim().length < 20) {
        return NextResponse.json({ success: false, error: "Could not extract text from PDF" }, { status: 400 });
      }

      const parsed = await parsePOPdfText(text);

      return NextResponse.json({ success: true, data: parsed });
    } finally {
      try { unlinkSync(tmpFile); } catch { /* ignore */ }
    }
  } catch (error) {
    console.error("PO PDF parse error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to parse PDF" }, { status: 500 });
  }
}
