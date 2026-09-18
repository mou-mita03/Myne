import { NextRequest, NextResponse } from "next/server";
import { isAllowedOnlineBookUrl } from "@/lib/online-books";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing PDF URL." }, { status: 400 });
  if (!isAllowedOnlineBookUrl(raw) || !raw.toLowerCase().includes(".pdf")) {
    return NextResponse.json({ error: "This online book source is not allowed." }, { status: 400 });
  }

  try {
    const upstream = await fetch(raw, {
      cache: "no-store",
      headers: { Accept: "application/pdf" },
    });
    const type = upstream.headers.get("content-type") || "";
    if (!upstream.ok || !type.includes("pdf")) return NextResponse.json({ error: "The source did not return a PDF." }, { status: 502 });
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Online PDF source could not be reached." }, { status: 502 });
  }
}
