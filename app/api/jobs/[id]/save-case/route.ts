import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, buildJourney } from "@/lib/claim-tools";
import { saveCase } from "@/lib/job-store";
import { claimProfileUpdateSchema } from "@/lib/schemas";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;

    const update = claimProfileUpdateSchema.parse(await request.json());
    auth.job.profile = { ...auth.job.profile, ...update };
    auth.job.journey = auth.job.journey.map((step) => ({ ...buildJourney(auth.job.profile).find((next) => next.id === step.id)!, status: step.status }));
    addAudit(auth.job, "profile_saved_case", "policyholder", "Profile saved as a persistent case.");
    const saved = await saveCase(auth.job, auth.secret);
    return NextResponse.json({ job: saved.job, caseReference: saved.caseReference, created: saved.created });
  } catch (error) {
    return apiError(error, error instanceof z.ZodError ? 400 : 500);
  }
}
