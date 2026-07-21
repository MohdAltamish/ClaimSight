import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, buildJourney } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";
import { claimProfileUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const update = claimProfileUpdateSchema.parse(await request.json());
    auth.job.profile = { ...auth.job.profile, ...update };
    auth.job.journey = auth.job.journey.map((step) => ({ ...buildJourney(auth.job.profile).find((next) => next.id === step.id)!, status: step.status }));
    addAudit(auth.job, "profile_updated", "policyholder", "Claim profile details updated.");
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
