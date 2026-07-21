import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { computeCoverageGaps } from "@/lib/pricing";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    if (!auth.job.inventory.some((item) => item.price)) {
      return NextResponse.json({ error: "Price the inventory before comparing it with the policy." }, { status: 409 });
    }
    if (!auth.job.policy) return NextResponse.json({ error: "Parse a policy before creating a coverage gap report." }, { status: 409 });

    auth.job.stages.analysis = { status: "running", message: "Comparing inventory totals with confirmed policy sub-limits." };
    auth.job.gaps = computeCoverageGaps(auth.job.inventory, auth.job.policy);
    auth.job.stages.analysis = { status: "complete", message: auth.job.gaps.length ? auth.job.gaps.length + " coverage gap(s) need attention." : "No confirmed sub-limit gaps were found." };
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error);
  }
}
