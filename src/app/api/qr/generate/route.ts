import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("data");
  if (!url) {
    return NextResponse.json({ error: "Missing data parameter" }, { status: 400 });
  }

  try {
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 200 });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "QR generation failed" }, { status: 500 });
  }
}
