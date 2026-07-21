import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, setJourneyStatus, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; stepId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id, stepId } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const status = z.object({ status: z.enum(["pending", "done", "overdue"]) }).parse(await request.json()).status;
    const step = auth.job.journey.find((entry) => entry.id === stepId);
    if (!step) return NextResponse.json({ error: "Journey step not found." }, { status: 404 });
    setJourneyStatus(auth.job, stepId, status);
    auth.job.timeline = [...auth.job.timeline, timelineEntry("note", `Journey step ${status}: ${step.title}`, "Updated by policyholder.")];
    addAudit(auth.job, "journey_updated", "policyholder", `${stepId} marked ${status}.`);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
