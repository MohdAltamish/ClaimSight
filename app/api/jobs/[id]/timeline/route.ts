import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ type: z.enum(["claim_notice", "submission", "insurer_response", "document", "receipt", "correspondence", "complaint", "expert_handoff", "note"]), title: z.string().min(1).max(120), detail: z.string().max(1000).default(""), date: z.string().max(20).optional() });

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const body = schema.parse(await request.json());
    auth.job.timeline = [...auth.job.timeline, timelineEntry(body.type, body.title, body.detail, body.date)];
    addAudit(auth.job, "timeline_entry_added", "policyholder", body.title);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
