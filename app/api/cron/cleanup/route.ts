import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredJobs } from "@/lib/job-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected && request.headers.get("authorization") !== "Bearer " + expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await cleanupExpiredJobs();
  return NextResponse.json({ ok: true });
}
