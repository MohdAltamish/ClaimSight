import { NextRequest, NextResponse } from "next/server";

export function requireAdmin(request: NextRequest) {
  const key = process.env.CLAIMSIGHT_ADMIN_KEY;
  if (!key) return { error: NextResponse.json({ error: "Admin review is not configured for this deployment." }, { status: 503 }) };
  if (request.headers.get("x-claimsight-admin-key") !== key) return { error: NextResponse.json({ error: "Admin authorization is required." }, { status: 401 }) };
  return { ok: true as const };
}
