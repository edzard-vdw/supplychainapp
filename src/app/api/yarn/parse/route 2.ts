import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { parseDeliveryNoteText } from "@/lib/actions/yarn-deliveries";

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

    const buffer = Buffer.from(await file.arrayBuffer());

    // Dynamic import to avoid type issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse") as { PDFParse: new (buf: Buffer) => { getText: () => Promise<{ text: string }> } };
    const parser = new PDFParse(buffer);
    const result = await parser.getText();
    const text = typeof result === "string" ? result : (result as { text?: string }).text || String(result);

    if (!text || text.trim().length < 10) {
      return NextResponse.json({ success: false, error: "Could not extract text from PDF" }, { status: 400 });
    }

    const parsed = await parseDeliveryNoteText(text);

    return NextResponse.json({
      success: true,
      data: parsed,
      rawTextPreview: text.substring(0, 500),
    });
  } catch (error) {
    console.error("PDF parse error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to parse PDF" }, { status: 500 });
  }
}
