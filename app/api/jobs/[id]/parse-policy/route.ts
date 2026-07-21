import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { parsePolicyText } from "@/lib/ai";
import { extractPdfText } from "@/lib/pdf";
import { saveJob } from "@/lib/job-store";

export const runtime = "nodejs";
export const maxDuration = 60;
type Context = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const body = await request.json();
    if (typeof body.pdfBase64 !== "string" || !body.pdfBase64.length) {
      return NextResponse.json({ error: "A policy PDF is required." }, { status: 400 });
    }

    auth.job.stages.policy = { status: "running", message: "Reading policy language and locating quoted terms." };
    await saveJob(auth.job, auth.secret);
    const policyText = await extractPdfText(body.pdfBase64);
    if (!policyText.trim()) throw new Error("No readable text was found in that PDF. Upload a text-based policy PDF.");

    auth.job.policy = await parsePolicyText(policyText, typeof body.sourceName === "string" ? body.sourceName : "Uploaded policy");
    auth.job.stages.policy = { status: "complete", message: auth.job.policy.findings.length + " quoted policy findings extracted for review." };
    await saveJob(auth.job, auth.secret);
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error, 422);
  }
}
