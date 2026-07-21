import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, correspondenceDraft, recordedDocument, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ letter: z.string().min(10).max(12000) });

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const { letter } = schema.parse(await request.json());
    const draft = correspondenceDraft(auth.job, letter);
    auth.job.correspondence = [...auth.job.correspondence, draft];
    auth.job.documents = [...auth.job.documents, recordedDocument("Insurer correspondence", "correspondence", "recorded", `Classified as ${draft.letterType.replace(/_/g, " ")}. Original text is not retained in the workspace.`)];
    auth.job.timeline = [...auth.job.timeline, timelineEntry("correspondence", "Insurer letter reviewed", draft.summary)];
    addAudit(auth.job, "correspondence_draft_created", "policyholder", draft.letterType);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job, draft });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
