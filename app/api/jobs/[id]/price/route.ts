import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { priceInventory } from "@/lib/pricing";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    if (!auth.job.inventory.length) return NextResponse.json({ error: "Extract or add inventory items before pricing." }, { status: 409 });

    auth.job.stages.pricing = { status: "running", message: "Applying transparent replacement and depreciation ranges." };
    auth.job.inventory = priceInventory(auth.job.inventory);
    auth.job.stages.pricing = { status: "complete", message: "Replacement ranges and ACV estimates are ready for review." };
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error);
  }
}
