import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { extractInventoryFromFrames } from "@/lib/ai";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const body = await request.json();
    const frames = Array.isArray(body.frames) ? body.frames.filter((frame: unknown) => typeof frame === "string").slice(0, 12) : [];
    if (!frames.length) return NextResponse.json({ error: "Provide at least one sampled image frame." }, { status: 400 });

    auth.job.stages.inventory = { status: "running", message: "Reviewing sampled walkthrough frames." };
    await saveJob(auth.job, auth.secret);
    const inventory = await extractInventoryFromFrames(frames);
    auth.job.inventory = inventory;
    auth.job.sourceFrameCount = frames.length;
    auth.job.stages.upload = { status: "complete", message: frames.length + " sampled frames received." };
    auth.job.stages.inventory = { status: "complete", message: inventory.length + " visible contents items extracted for review." };
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error, 422);
  }
}
