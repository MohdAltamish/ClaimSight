import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, complaintDraft, recordedDocument, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ reason: z.string().min(10).max(2500) });

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const { reason } = schema.parse(await request.json());
    const complaint = complaintDraft(auth.job, reason);
    auth.job.complaints = [...auth.job.complaints, complaint];
    auth.job.documents = [...auth.job.documents, recordedDocument("Complaint draft — human review required", "other", "generated", "ClaimSight created a draft only. It has not been sent to a regulator.")];
    auth.job.timeline = [...auth.job.timeline, timelineEntry("complaint", "Complaint draft created", "Draft is ready for human review; ClaimSight did not send it.")];
    addAudit(auth.job, "complaint_draft_created", "policyholder", "Awaiting human review.");
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job, complaint });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
