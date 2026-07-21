import { z } from "zod";
import { extractedInventorySchema, parsedPolicySchema } from "@/lib/schemas";
import type { InventoryItem, PolicySummary } from "@/lib/types";
import { languageNames, type AppLanguage } from "@/lib/language";
import { getGeminiApiKey, hasGeminiKey } from "@/lib/ai-settings";
import { generateGeminiJson } from "@/lib/gemini";

export type AssistantMode = "guide" | "intake";
export type AssistantTranscriptMessage = { role: "user" | "assistant"; content: string };
export type IntakeAssistantState = {
  lossType?: "fire" | "water" | "storm" | "other";
  rooms?: string[];
  itemGroups?: Array<{ room: string; items: string }>;
  state?: string;
  insurer?: string;
  lossDate?: string;
};

export type AssistantReply = {
  reply: string;
  suggestedReplies: string[];
  readyToReview: boolean;
  intakePatch?: IntakeAssistantState;
};

export { hasGeminiKey };

const inventoryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "category", "brand", "model", "quantity", "condition", "room", "confidence", "notes"],
        properties: {
          name: { type: "string" },
          category: { type: "string" },
          brand: { type: "string" },
          model: { type: "string" },
          quantity: { type: "integer" },
          condition: { type: "string", enum: ["new", "good", "fair", "poor"] },
          room: { type: "string" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          notes: { type: "string" }
        }
      }
    }
  }
};

const policyJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["contentsLimit", "deductible", "coverageBasis", "findings"],
  properties: {
    contentsLimit: { type: ["number", "null"] },
    deductible: { type: ["number", "null"] },
    coverageBasis: { type: "string", enum: ["RCV", "ACV", "unknown"] },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "label", "amount", "appliesTo", "quote", "page", "confidence"],
        properties: {
          kind: { type: "string", enum: ["coverage", "deductible", "sublimit", "exclusion"] },
          label: { type: "string" },
          amount: { type: ["number", "null"] },
          appliesTo: { type: ["string", "null"] },
          quote: { type: "string" },
          page: { type: "integer" },
          confidence: { type: "string", enum: ["high", "medium", "low"] }
        }
      }
    }
  }
};

const assistantJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "suggestedReplies", "readyToReview", "intakePatch"],
  properties: {
    reply: { type: "string" },
    suggestedReplies: { type: "array", items: { type: "string" } },
    readyToReview: { type: "boolean" },
    intakePatch: {
      type: "object",
      additionalProperties: false,
      required: ["lossType", "rooms", "itemGroups", "state", "insurer", "lossDate"],
      properties: {
        lossType: { type: ["string", "null"], enum: ["fire", "water", "storm", "other", null] },
        rooms: { type: "array", items: { type: "string" } },
        itemGroups: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["room", "items"],
            properties: { room: { type: "string" }, items: { type: "string" } }
          }
        },
        state: { type: ["string", "null"] },
        insurer: { type: ["string", "null"] },
        lossDate: { type: ["string", "null"] }
      }
    }
  }
};

const assistantOutputSchema = z.object({
  reply: z.string().min(1),
  suggestedReplies: z.array(z.string()),
  readyToReview: z.boolean(),
  intakePatch: z.object({
    lossType: z.enum(["fire", "water", "storm", "other"]).nullable(),
    rooms: z.array(z.string()),
    itemGroups: z.array(z.object({ room: z.string(), items: z.string() })),
    state: z.string().nullable(),
    insurer: z.string().nullable(),
    lossDate: z.string().nullable()
  })
});

function normalizeIntakePatch(patch: z.infer<typeof assistantOutputSchema>["intakePatch"]): IntakeAssistantState {
  return {
    ...(patch.lossType ? { lossType: patch.lossType } : {}),
    ...(patch.rooms.length ? { rooms: patch.rooms } : {}),
    ...(patch.itemGroups.length ? { itemGroups: patch.itemGroups } : {}),
    ...(patch.state ? { state: patch.state } : {}),
    ...(patch.insurer ? { insurer: patch.insurer } : {}),
    ...(patch.lossDate ? { lossDate: patch.lossDate } : {})
  };
}

function imagePart(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) throw new Error("One of the sampled images could not be prepared for Gemini analysis.");
  return { inlineData: { mimeType: match[1], data: match[2] } };
}

function assistantInstructions(mode: AssistantMode, language: AppLanguage) {
  const responseLanguage = `Write every user-visible reply and suggested reply in ${languageNames[language]}.`;
  if (mode === "guide") {
    return [
      "You are the ClaimSight Guide: a calm, concise in-app assistant for policyholders documenting a disaster contents claim.",
      "Answer only about ClaimSight's visible workflow: starting a sample, uploading photos/video and a policy PDF, reviewing the inventory, evidence confidence, pricing ranges, ACV, policy quotes, coverage gaps, exports, temporary storage, and deletion.",
      "ACV means actual cash value: the depreciated value, not the cost to replace an item new. Explain that in plain language if it is relevant.",
      "Do not invent policy limits, claim outcomes, insurer requirements, legal conclusions, pricing, screen data, or capabilities that are not in ClaimSight. You do not have the user's policy.",
      "Do not ask for addresses, policy numbers, payment details, or other sensitive information. Do not encourage exaggeration. Unknown is better than a guess.",
      "If the user asks about a denied claim, bad faith, or a legal dispute, briefly recommend a licensed public adjuster or attorney. Never imply you are one.",
      "Return a helpful answer of at most 110 words and 2–3 short suggested next questions. Set readyToReview to false and return an intakePatch with null fields and empty arrays.",
      responseLanguage
    ].join(" ");
  }

  return [
    "You are the ClaimSight Intake Assistant. Have a trauma-aware, one-question-at-a-time conversation that helps a policyholder form an editable contents-inventory draft from memory.",
    "Use the transcript and current intake state. Ask the single most useful next question. Start with the loss type, then rooms, then the items remembered in one room at a time. Accept natural answers such as 'living room: sofa, TV, 2 lamps'.",
    "Extract only facts explicitly stated by the user into intakePatch. Never infer or invent brands, models, condition, age, receipts, quantities, values, rooms, loss type, insurer, state, or dates. Do not request a policy number, address, payment data, or other sensitive information.",
    "For intakePatch, include only new or corrected facts from the most recent user message; use null or empty arrays for fields not provided. Keep item descriptions in natural, comma-separated phrasing. Put a room in both rooms and itemGroups when the user supplies items for it.",
    "Set readyToReview to true only when at least one room has at least one explicitly supplied item. Once ready, explain that the user can review and edit the draft before a claim is created. Never say anything has been filed or sent.",
    "Be concise, factual, and calm. Unknown details will stay unknown. Return 2–3 short suggested replies.",
    responseLanguage
  ].join(" ");
}

export async function generateAssistantReply(
  mode: AssistantMode,
  messages: AssistantTranscriptMessage[],
  intake?: IntakeAssistantState,
  language: AppLanguage = "en"
): Promise<AssistantReply> {
  const boundedMessages = messages.slice(-16).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
  const stateContext = mode === "intake"
    ? `\n\nCURRENT INTAKE STATE (may be incomplete; do not repeat as a user-provided fact unless it is present):\n${JSON.stringify(intake ?? {})}`
    : "";

  const response = await generateGeminiJson<unknown>({
    apiKey: await getGeminiApiKey(),
    contents: boundedMessages,
    instructions: assistantInstructions(mode, language) + stateContext,
    schema: assistantJsonSchema,
    thinkingBudget: 1024
  });
  const parsed = assistantOutputSchema.parse(response);
  return {
    reply: parsed.reply,
    suggestedReplies: parsed.suggestedReplies.slice(0, 3),
    readyToReview: parsed.readyToReview,
    intakePatch: mode === "intake" ? normalizeIntakePatch(parsed.intakePatch) : undefined
  };
}

export async function extractInventoryFromFrames(frameDataUrls: string[]): Promise<InventoryItem[]> {
  const input: Array<Record<string, unknown>> = [
    {
      text: [
        "You are ClaimSight, a policyholder-side contents inventory assistant.",
        "Review these home-video frames together. Return only distinct visible possessions, grouped by room.",
        "Ignore walls, floors, windows, cabinets, fixtures, and other structural elements.",
        "Never invent brands or models. Use unknown or unbranded when not visible.",
        "Use a quantity only when supported by the frames. Mark uncertain items low confidence.",
        "This is insurance documentation: accuracy is more important than completeness."
      ].join(" ")
    },
    ...frameDataUrls.map(imagePart)
  ];

  const response = await generateGeminiJson<unknown>({
    apiKey: await getGeminiApiKey(),
    contents: [{ role: "user", parts: input }],
    instructions: "Return only the requested structured inventory. Follow the evidence and never fabricate uncertain details.",
    schema: inventoryJsonSchema,
    thinkingBudget: 1024
  });
  const parsed = extractedInventorySchema.parse(response);
  return parsed.items.map((item, index) => ({
    ...item,
    id: "item-" + crypto.randomUUID(),
    evidenceFrameIds: ["frame-" + ((index % frameDataUrls.length) + 1)]
  }));
}

export async function parsePolicyText(policyText: string, sourceName: string): Promise<PolicySummary> {
  const boundedText = policyText.slice(0, 120000);
  const response = await generateGeminiJson<unknown>({
    apiKey: await getGeminiApiKey(),
    contents: [{
      role: "user",
      parts: [{
        text: [
          "You are a careful insurance-policy parser. Extract only terms stated in the supplied policy text.",
          "Find personal-property/contents coverage, deductible, ACV versus replacement-cost terms, category sub-limits, and exclusions.",
          "For every finding, copy an exact supporting quote and its page number from the page markers.",
          "If a term is absent or ambiguous, return unknown/null; never infer coverage.",
          "This output is informational and not legal or adjusting advice.",
          "POLICY TEXT:",
          boundedText
        ].join("\n\n")
      }]
    }],
    instructions: "Return only the requested structured policy analysis.",
    schema: policyJsonSchema,
    thinkingBudget: 8192
  });
  const parsed = parsedPolicySchema.parse(response);
  return {
    contentsLimit: parsed.contentsLimit ?? undefined,
    deductible: parsed.deductible ?? undefined,
    coverageBasis: parsed.coverageBasis,
    sourceName,
    findings: parsed.findings.map((finding) => ({
      id: "policy-" + crypto.randomUUID(),
      kind: finding.kind,
      label: finding.label,
      amount: finding.amount ?? undefined,
      appliesTo: finding.appliesTo ?? undefined,
      quote: finding.quote,
      page: finding.page,
      confidence: finding.confidence
    }))
  };
}
