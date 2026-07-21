import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, demoExperts, expertHandoff, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({ expertId: z.string().min(1), consent: z.literal(true) });

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const { expertId } = schema.parse(await request.json());
    const expert = demoExperts.find((entry) => entry.id === expertId);
    if (!expert) return NextResponse.json({ error: "Directory entry not found." }, { status: 404 });
    const handoff = expertHandoff(expert.id, expert.name, auth.job.profile.state || expert.state);
    auth.job.expertHandoffs = [...auth.job.expertHandoffs, handoff];
    auth.job.timeline = [...auth.job.timeline, timelineEntry("expert_handoff", `Support request prepared: ${expert.name}`, "Consent recorded. No external data was transmitted by this MVP.")];
    addAudit(auth.job, "expert_handoff_requested", "policyholder", `${expert.name}; consent recorded; no transmission.`);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job, handoff });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
