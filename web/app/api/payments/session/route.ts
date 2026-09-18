import { NextRequest, NextResponse } from "next/server";
import { isPaymentProvider } from "@/lib/commerce";

/**
 * Deliberately fail closed until a trusted server integration is configured.
 * Production flow: verify Firebase ID token -> load price server-side -> create
 * the provider session -> persist a pending transaction. The webhook, not this
 * browser call, grants the entitlement after provider signature verification.
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Sign in is required to purchase a book." }, { status: 401 });
  const body = await request.json().catch(() => null) as { bookId?: unknown; provider?: unknown } | null;
  if (!body || !Number.isInteger(body.bookId) || typeof body.provider !== "string" || !isPaymentProvider(body.provider)) {
    return NextResponse.json({ error: "Invalid payment request." }, { status: 400 });
  }
  return NextResponse.json({ error: "Payments are not configured. Connect a verified bKash, Nagad, or card server integration before enabling paid titles." }, { status: 503 });
}
