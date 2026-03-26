import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseDeliveryNoteText } from "@/lib/actions/yarn-deliveries";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Write PDF to temp file
    const buffer = Buffer.from(await file.arrayBuffer());
    const tmpFile = join(tmpdir(), `dn-${Date.now()}.pdf`);
    writeFileSync(tmpFile, buffer);

    try {
      // Run PDF extractor as separate process (avoids pdfjs-dist worker bundling issues)
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

      const parsed = await parseDeliveryNoteText(text);

      // Resolve colour codes against master colour map
      if (parsed.lines.length > 0) {
        const codes = parsed.lines.map((l) => l.colourCode);
        const colourMappings = await prisma.colourMap.findMany({
          where: { millColourCode: { in: codes } },
          select: { millColourCode: true, sheepIncName: true },
        });
        const colourLookup = new Map(colourMappings.map((c) => [c.millColourCode, c.sheepIncName]));
        for (const line of parsed.lines) {
          line.sheepIncName = colourLookup.get(line.colourCode) || null;
        }
      }

      return NextResponse.json({
        success: true,
        data: parsed,
        rawTextPreview: text.substring(0, 500),
      });
    } finally {
      try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
    }
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse PDF",
    }, { status: 500 });
  }
}
