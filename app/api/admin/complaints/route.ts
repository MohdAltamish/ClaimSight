import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { listJobsForAdmin } from "@/lib/job-store";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if ("error" in admin) return admin.error;
    const jobs = await listJobsForAdmin();
    const complaints = jobs.flatMap((job) => job.complaints.map((complaint) => ({
      claimId: job.id,
      claimTitle: job.title,
      state: job.profile.state || "Not provided",
      insurer: job.profile.insurer || "Not provided",
      ...complaint
    })));
    return NextResponse.json({
      complaints,
      metrics: {
        open: complaints.filter((entry) => entry.status !== "resolved").length,
        awaitingHumanReview: complaints.filter((entry) => entry.status === "ready_for_human_review").length,
        total: complaints.length
      },
      notice: "This queue supports human review only. External regulator dispatch and email notifications are intentionally disabled."
    });
  } catch (error) { return apiError(error); }
}
