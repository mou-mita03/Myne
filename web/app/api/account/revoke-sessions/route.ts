import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { requireUser, unauthenticatedResponse } from "@/lib/auth/require-user";

/** Revokes Firebase refresh tokens; the UID comes only from the verified token. */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const adminAuth = getFirebaseAdminAuth();
    if (!adminAuth) return NextResponse.json({ error: "Session management is unavailable." }, { status: 503 });
    await adminAuth.revokeRefreshTokens(user.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return unauthenticatedResponse(error);
  }
}
