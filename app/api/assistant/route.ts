import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api";
import { generateAssistantReply, hasGeminiKey, type AssistantMode, type AssistantReply } from "@/lib/ai";
import { copy, type AppLanguage } from "@/lib/language";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000)
});

const intakeSchema = z.object({
  lossType: z.enum(["fire", "water", "storm", "other"]).optional(),
  rooms: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
  itemGroups: z.array(z.object({ room: z.string().trim().min(1).max(80), items: z.string().trim().min(1).max(1500) })).max(12).optional(),
  state: z.string().trim().max(40).optional(),
  insurer: z.string().trim().max(100).optional(),
  lossDate: z.string().trim().max(20).optional()
}).optional();

const requestSchema = z.object({
  mode: z.enum(["guide", "intake"]),
  language: z.enum(["en", "hi", "es", "de"]).optional(),
  messages: z.array(messageSchema).min(1).max(16),
  intake: intakeSchema
}).strict();

function fallbackReply(mode: AssistantMode, userMessage: string, intake?: z.infer<typeof intakeSchema>, language: AppLanguage = "en"): AssistantReply {
  const question = userMessage.toLowerCase();
  const text = copy[language];
  if (mode === "guide") {
    if (question.includes("acv") || question.includes("cash value")) {
      return { reply: "ACV means actual cash value: the depreciated value of an item, rather than what it costs new. ClaimSight keeps ACV separate from the replacement-cost range when it can.", suggestedReplies: ["What should I upload?", "Why review every item?"], readyToReview: false };
    }
    if (question.includes("upload") || question.includes("photo") || question.includes("video")) {
      return { reply: "You can begin with a walkthrough video, photos, or old listing images, then add a text-based policy PDF if you have one. The sample claim is a safe way to see the full review and export workflow first.", suggestedReplies: ["Try a sample claim", "What is a coverage gap?"], readyToReview: false };
    }
    return { reply: text.guideOffline, suggestedReplies: text.guidePrompts, readyToReview: false };
  }
  const lossType = question.includes("fire") ? "fire" : question.includes("water") || question.includes("flood") ? "water" : question.includes("storm") || question.includes("hurricane") || question.includes("wind") ? "storm" : question.includes("other") ? "other" : undefined;
  if (lossType) {
    return {
      reply: `I’ve marked this as a ${lossType} loss. Which room should we start with? You can answer naturally, for example “Living room: sofa, TV, 2 lamps.”`,
      suggestedReplies: ["Living room: sofa, TV", "Kitchen: refrigerator, table", "Primary bedroom: bed, dresser"],
      readyToReview: false,
      intakePatch: { lossType }
    };
  }
  const roomAndItems = userMessage.match(/^\s*([^:\n]{2,80})\s*:\s*(.+)\s*$/);
  if (roomAndItems) {
    const room = roomAndItems[1].trim();
    const items = roomAndItems[2].trim();
    return {
      reply: `I captured the items you remember in ${room}. Add another room in the same format, or create the editable draft whenever the list feels ready.`,
      suggestedReplies: ["Add another room", "Create my draft"],
      readyToReview: true,
      intakePatch: { rooms: [room], itemGroups: [{ room, items }] }
    };
  }
  if (!intake?.lossType) {
    return { reply: text.intakeGreeting, suggestedReplies: text.lossTypes.slice(0, 3), readyToReview: false, intakePatch: {} };
  }
  return { reply: "Please add one room and its items in a simple format, such as “Kitchen: refrigerator, microwave, 4 dining chairs.” I’ll keep anything you do not know as unknown.", suggestedReplies: ["Living room: sofa, TV", "Kitchen: refrigerator, table"], readyToReview: Boolean(intake.itemGroups?.length), intakePatch: {} };
}

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());
    const latestUserMessage = [...body.messages].reverse().find((message) => message.role === "user")?.content ?? "";
    const language = body.language ?? "en";
    if (!await hasGeminiKey()) {
      return NextResponse.json({ ...fallbackReply(body.mode, latestUserMessage, body.intake, language), source: "offline" });
    }
    const reply = await generateAssistantReply(body.mode, body.messages, body.intake, language);
    return NextResponse.json({ ...reply, source: "live" });
  } catch (error) {
    return apiError(error, error instanceof z.ZodError ? 400 : 500);
  }
}
