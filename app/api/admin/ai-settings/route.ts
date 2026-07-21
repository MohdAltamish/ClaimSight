import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { getGeminiSettingsStatus, saveGeminiApiKey } from "@/lib/ai-settings";
import { verifyGeminiApiKey } from "@/lib/gemini";

export const runtime = "nodejs";

const schema = z.object({ apiKey: z.string().trim().min(20).max(512) }).strict();

export async function GET(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if ("error" in admin) return admin.error;
    return NextResponse.json(await getGeminiSettingsStatus());
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = requireAdmin(request);
    if ("error" in admin) return admin.error;
    const { apiKey } = schema.parse(await request.json());
    try {
      await verifyGeminiApiKey(apiKey);
    } catch {
      return NextResponse.json({ error: "The Gemini API key could not be verified. The existing key was not changed." }, { status: 422 });
    }
    await saveGeminiApiKey(apiKey);
    return NextResponse.json(await getGeminiSettingsStatus());
  } catch (error) {
    return apiError(error, error instanceof z.ZodError ? 400 : 500);
  }
}
