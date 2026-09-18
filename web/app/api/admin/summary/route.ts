import { NextResponse } from "next/server";
import { adminRequiredResponse, requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (error) {
    return adminRequiredResponse(error);
  }

  const authorization = request.headers.get("authorization")!;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const response = await fetch(`${apiUrl}/admin/summary`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({ error: "Admin service returned an invalid response." }));
  return NextResponse.json(body, { status: response.status });
}
