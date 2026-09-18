import "server-only";

import { NextResponse } from "next/server";
import { requireUser, UnauthenticatedError, type VerifiedUser } from "@/lib/auth/require-user";

export class AdminRequiredError extends Error {
  readonly status = 403;

  constructor(message = "Administrator access is required.") {
    super(message);
    this.name = "AdminRequiredError";
  }
}

export async function requireAdmin(request: Request): Promise<VerifiedUser> {
  const user = await requireUser(request);
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/users/me`, {
      headers: { Authorization: request.headers.get("authorization") ?? "" },
      cache: "no-store",
    });
    if (response.status === 401) {
      throw new UnauthenticatedError("Your sign-in session is invalid or has expired.");
    }
    if (!response.ok) {
      throw new AdminRequiredError("Administrator authorization could not be verified.");
    }
    const profile = await response.json() as { role?: unknown };
    if (profile.role !== "ADMIN") throw new AdminRequiredError();
  } catch (error) {
    if (error instanceof UnauthenticatedError || error instanceof AdminRequiredError) throw error;
    throw new AdminRequiredError("Administrator authorization could not be verified.");
  }
  return user;
}

export function adminRequiredResponse(error: unknown) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof AdminRequiredError ? error.message : "Administrator access is required.";
  const status = error instanceof AdminRequiredError ? error.status : 500;
  return NextResponse.json({ error: message }, { status });
}
