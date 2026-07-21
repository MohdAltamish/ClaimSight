import { GoogleGenAI } from "@google/genai";

export const GEMINI_MODEL = "gemini-2.5-flash";

export async function generateGeminiJson<T>(options: {
  apiKey: string;
  contents: unknown;
  instructions: string;
  schema: Record<string, unknown>;
  thinkingBudget?: number;
}) {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: options.contents as never,
    config: {
      systemInstruction: options.instructions,
      responseMimeType: "application/json",
      responseJsonSchema: options.schema,
      ...(options.thinkingBudget === undefined ? {} : { thinkingConfig: { thinkingBudget: options.thinkingBudget } })
    }
  });
  if (!response.text) throw new Error("The model returned no structured output.");
  return JSON.parse(response.text) as T;
}

export async function verifyGeminiApiKey(apiKey: string) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: "Reply with OK.",
    config: { maxOutputTokens: 4, thinkingConfig: { thinkingBudget: 0 } }
  });
  if (!response.text?.trim()) throw new Error("Gemini returned no response.");
}
