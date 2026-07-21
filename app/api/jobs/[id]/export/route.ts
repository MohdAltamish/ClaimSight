import { NextRequest, NextResponse } from "next/server";
import { apiError, authorizedJob } from "@/lib/api";
import { claimCsv, claimPdf } from "@/lib/export";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    const format = new URL(request.url).searchParams.get("format");
    if (format === "csv") {
      return new NextResponse(claimCsv(auth.job), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=claimsight-inventory.csv"
        }
      });
    }
    if (format === "pdf") {
      return new NextResponse(claimPdf(auth.job), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=claimsight-claim-report.pdf"
        }
      });
    }
    return NextResponse.json({ error: "Use format=csv or format=pdf." }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
