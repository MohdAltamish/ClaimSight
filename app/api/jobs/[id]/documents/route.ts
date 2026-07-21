import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError, authorizedJob } from "@/lib/api";
import { addAudit, receiptMatchesFor, recordedDocument, timelineEntry } from "@/lib/claim-tools";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const schema = z.object({
  name: z.string().min(1).max(160),
  category: z.enum(["policy", "evidence", "receipt", "correspondence", "export", "adjuster_report", "other"]),
  summary: z.string().max(5000).optional(),
  linkedItemIds: z.array(z.string().max(100)).max(40).optional()
});

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const body = schema.parse(await request.json());
    const document = recordedDocument(body.name, body.category, "recorded", body.summary, body.linkedItemIds ?? []);
    auth.job.documents = [...auth.job.documents, document];
    if (body.category === "receipt" && body.summary) {
      const matches = receiptMatchesFor(document.id, body.summary, auth.job.inventory);
      auth.job.receiptMatches = [...auth.job.receiptMatches, ...matches];
      auth.job.inventory = auth.job.inventory.map((item) => {
        const match = matches.find((entry) => entry.itemId === item.id);
        return match ? { ...item, verification: "receipt_verified" as const, verifiedPurchasePrice: match.purchasePrice } : item;
      });
    }
    auth.job.timeline = [...auth.job.timeline, timelineEntry(body.category === "receipt" ? "receipt" : "document", `Document registered: ${document.name}`, "Metadata and a short summary were saved to this temporary claim workspace.")];
    addAudit(auth.job, "document_registered", "policyholder", `${body.category}: ${document.name}`);
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
