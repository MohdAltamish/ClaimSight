import { NextRequest, NextResponse } from "next/server";
import { createDemoJob } from "@/lib/demo";
import { hasGeminiKey } from "@/lib/ai";
import { createJob, saveJob } from "@/lib/job-store";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ liveAnalysis: await hasGeminiKey() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "demo" ? "demo" : body.mode === "questionnaire" ? "questionnaire" : "upload";
    const created = await createJob(mode, body.title);
    if (mode === "demo") {
      const job = createDemoJob(created.job.id);
      await saveJob(job, created.accessSecret);
      return NextResponse.json({ ...created, job });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
