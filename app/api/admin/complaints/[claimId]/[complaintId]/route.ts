import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { getJobForAdmin, saveJobAsAdmin } from "@/lib/job-store";

export const runtime = "nodejs";
type Context = { params: Promise<{ claimId: string; complaintId: string }> };
const schema = z.object({ status: z.enum(["new", "under_review", "ready_for_human_review", "resolved"]), note: z.string().max(1000).optional() });

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const admin = requireAdmin(request);
    if ("error" in admin) return admin.error;
    const { claimId, complaintId } = await context.params;
    const body = schema.parse(await request.json());
    const job = await getJobForAdmin(claimId);
    if (!job) return NextResponse.json({ error: "Claim workspace is unavailable or has expired." }, { status: 404 });
    const complaint = job.complaints.find((entry) => entry.id === complaintId);
    if (!complaint) return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    complaint.status = body.status;
    complaint.updatedAt = new Date().toISOString();
    job.auditLog = [...job.auditLog, { id: crypto.randomUUID(), action: "complaint_review_status_changed", actor: "admin", at: complaint.updatedAt, detail: `${body.status}${body.note ? `: ${body.note}` : ""}` }];
    await saveJobAsAdmin(job);
    return NextResponse.json({ job });
  } catch (error) { return apiError(error, error instanceof z.ZodError ? 400 : 500); }
}
