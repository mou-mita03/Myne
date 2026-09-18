import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";

export type VerifiedUser = Pick<DecodedIdToken, "uid" | "email" | "email_verified"> & DecodedIdToken;

export class UnauthenticatedError extends Error {
  readonly status = 401;

  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export function unauthenticatedResponse(error: unknown) {
  const message = error instanceof UnauthenticatedError ? error.message : "Authentication is required.";
  return NextResponse.json({ error: message }, { status: 401 });
}

/** Verifies the Firebase ID token; request data must never supply identity. */
export async function requireUser(request: Request): Promise<VerifiedUser> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthenticatedError("A Firebase ID token is required.");
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new UnauthenticatedError("A Firebase ID token is required.");

  const adminAuth = getFirebaseAdminAuth();
  if (!adminAuth) throw new UnauthenticatedError("Authentication service is unavailable.");

  try {
    return await adminAuth.verifyIdToken(token, true);
  } catch (reason) {
    const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
    if (code === "auth/id-token-revoked") {
      throw new UnauthenticatedError("Your sign-in session has been revoked. Please sign in again.");
    }
    throw new UnauthenticatedError("Your sign-in session is invalid or has expired.");
  }
}
