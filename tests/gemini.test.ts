import { describe, expect, it, vi } from "vitest";

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  }
}));

import { GEMINI_MODEL, generateGeminiJson, verifyGeminiApiKey } from "@/lib/gemini";

describe("Gemini client", () => {
  it("uses Gemini 2.5 Flash with JSON-mode structured output", async () => {
    generateContent.mockResolvedValueOnce({ text: '{"ok":true}' });

    await expect(generateGeminiJson<{ ok: boolean }>({
      apiKey: "test-key",
      contents: [{ role: "user", parts: [{ text: "hello" }] }],
      instructions: "Return JSON.",
      schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"] },
      thinkingBudget: 1024
    })).resolves.toEqual({ ok: true });

    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: GEMINI_MODEL,
      config: expect.objectContaining({
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 1024 }
      })
    }));
  });

  it("verifies a replacement key with the same fixed model", async () => {
    generateContent.mockResolvedValueOnce({ text: "OK" });
    await expect(verifyGeminiApiKey("test-key")).resolves.toBeUndefined();
    expect(generateContent).toHaveBeenLastCalledWith(expect.objectContaining({ model: "gemini-2.5-flash" }));
  });
});
