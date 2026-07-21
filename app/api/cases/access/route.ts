import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { getSavedCase, hasSupabaseStorage } from "@/lib/job-store";

export const runtime = "nodejs";

const schema = z.object({
  caseReference: z.string().trim().min(1).max(32),
  recoveryCode: z.string().trim().min(1).max(200)
}).strict();

export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseStorage()) {
      return NextResponse.json({ error: "Saved cases are not configured for this deployment." }, { status: 503 });
    }
    const body = schema.parse(await request.json());
    const job = await getSavedCase(body.caseReference, body.recoveryCode);
    if (!job) return NextResponse.json({ error: "Invalid Case ID or recovery code." }, { status: 401 });
    return NextResponse.json({ job, workspaceId: job.id });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid Case ID or recovery code." }, { status: 401 });
    return apiError(error);
  }
}
