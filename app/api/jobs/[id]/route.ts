import { NextRequest, NextResponse } from "next/server";
import { authorizedJob, apiError } from "@/lib/api";
import { deleteJob } from "@/lib/job-store";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    return NextResponse.json({ job: auth.job });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const auth = await authorizedJob(request, id);
    if ("error" in auth) return auth.error;
    await deleteJob(id, auth.secret);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
