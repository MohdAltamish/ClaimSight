import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, buildJourney, inventoryFromQuestionnaire, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";
import { computeCoverageGaps, priceInventory } from "@/lib/pricing";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  answers: z.string().min(3).max(12000),
  state: z.string().max(40).optional(),
  insurer: z.string().max(100).optional(),
  lossDate: z.string().max(20).optional(),
  language: z.enum(["en", "hi", "es", "de"]).optional()
});

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const body = schema.parse(await request.json());
    const items = inventoryFromQuestionnaire(body.answers);
    if (!items.length) return NextResponse.json({ error: "Add at least one item, for example: Kitchen: refrigerator, 4 dining chairs." }, { status: 422 });
    auth.job.profile = { ...auth.job.profile, state: body.state ?? auth.job.profile.state, insurer: body.insurer ?? auth.job.profile.insurer, lossDate: body.lossDate ?? auth.job.profile.lossDate, language: body.language ?? auth.job.profile.language };
    auth.job.journey = buildJourney(auth.job.profile);
    auth.job.inventory = priceInventory(items);
    auth.job.stages.upload = { status: "complete", message: "Memory intake recorded; no media was uploaded." };
    auth.job.stages.inventory = { status: "complete", message: `${items.length} memory-based item(s) added for review.` };
    auth.job.stages.pricing = { status: "complete", message: "Transparent replacement and ACV ranges applied; condition is marked unknown." };
    if (auth.job.policy) {
      auth.job.gaps = computeCoverageGaps(auth.job.inventory, auth.job.policy);
      auth.job.stages.analysis = { status: "complete", message: "Coverage comparison updated." };
    }
    auth.job.timeline = [...auth.job.timeline, timelineEntry("note", "Memory inventory created", "Items were entered from a guided no-video intake.")];
    addAudit(auth.job, "questionnaire_completed", "policyholder", `${items.length} memory-entered items created.`);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
