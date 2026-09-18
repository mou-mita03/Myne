import { NextRequest, NextResponse } from "next/server";

/**
 * Protected books must be served only after server-side ID-token verification
 * and an entitlement lookup written by a verified payment webhook. This route
 * exposes no file or storage location until that trusted service is installed.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ error: `Protected ebook ${id} is unavailable until secure entitlement delivery is configured.` }, { status: 503 });
}
