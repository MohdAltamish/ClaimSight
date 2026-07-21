import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { inventoryPatchSchema } from "@/lib/schemas";
import { computeCoverageGaps, priceInventory } from "@/lib/pricing";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id, itemId } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const update = inventoryPatchSchema.parse(await request.json());
    const item = auth.job.inventory.find((candidate) => candidate.id === itemId);
    if (!item) return NextResponse.json({ error: "Inventory item not found." }, { status: 404 });

    Object.assign(item, update, { userEdited: true });
    auth.job.inventory = priceInventory(auth.job.inventory);
    auth.job.gaps = computeCoverageGaps(auth.job.inventory, auth.job.policy);
    auth.job.stages.pricing = { status: "complete", message: "Pricing recalculated after your edit." };
    auth.job.stages.analysis = auth.job.policy
      ? { status: "complete", message: "Coverage report recalculated after your edit." }
      : { status: "waiting" };
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error, 422);
  }
}
