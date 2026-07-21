import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/job-store";

export function getJobSecret(request: NextRequest) {
  return request.headers.get("x-job-secret") ?? "";
}

export async function authorizedJob(request: NextRequest, id: string) {
  const secret = getJobSecret(request);
  if (!secret) return { error: NextResponse.json({ error: "Missing claim workspace credential." }, { status: 401 }) };
  const job = await getJob(id, secret);
  if (!job) return { error: NextResponse.json({ error: "Claim workspace is unavailable or has expired." }, { status: 404 }) };
  return { job, secret };
}

export function apiError(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  return NextResponse.json({ error: message }, { status });
}
