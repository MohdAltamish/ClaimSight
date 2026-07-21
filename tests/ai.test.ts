import { describe, expect, it, vi } from "vitest";

const { generateGeminiJson, getGeminiApiKey } = vi.hoisted(() => ({
  generateGeminiJson: vi.fn(),
  getGeminiApiKey: vi.fn()
}));

vi.mock("@/lib/ai-settings", () => ({
  getGeminiApiKey,
  hasGeminiKey: vi.fn()
}));

vi.mock("@/lib/gemini", () => ({ generateGeminiJson }));

import { extractInventoryFromFrames, generateAssistantReply, parsePolicyText } from "@/lib/ai";

const emptyPatch = { lossType: null, rooms: [], itemGroups: [], state: null, insurer: null, lossDate: null };

describe("ClaimSight Gemini workflows", () => {
  it("routes guide, intake, inventory, and policy work through the Gemini JSON client", async () => {
    getGeminiApiKey.mockResolvedValue("test-key");
    generateGeminiJson
      .mockResolvedValueOnce({ reply: "Use a sample claim first.", suggestedReplies: ["Try sample"], readyToReview: false, intakePatch: emptyPatch })
      .mockResolvedValueOnce({ reply: "Which room should we start with?", suggestedReplies: ["Living room"], readyToReview: false, intakePatch: { ...emptyPatch, lossType: "fire" } })
      .mockResolvedValueOnce({ items: [{ name: "Television", category: "tv", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Living room", confidence: "high", notes: "" }] })
      .mockResolvedValueOnce({ contentsLimit: 50000, deductible: 1000, coverageBasis: "RCV", findings: [] });

    await generateAssistantReply("guide", [{ role: "user", content: "How does this work?" }]);
    await generateAssistantReply("intake", [{ role: "user", content: "It was a fire." }]);
    await extractInventoryFromFrames(["data:image/jpeg;base64,AA=="]);
    await parsePolicyText("[Page 1] Coverage C is $50,000.", "policy.pdf");

    expect(generateGeminiJson).toHaveBeenCalledTimes(4);
    expect(getGeminiApiKey).toHaveBeenCalledTimes(4);
    expect(generateGeminiJson).toHaveBeenNthCalledWith(3, expect.objectContaining({
      apiKey: "test-key",
      contents: expect.arrayContaining([expect.objectContaining({
        parts: expect.arrayContaining([expect.objectContaining({ inlineData: { mimeType: "image/jpeg", data: "AA==" } })])
      })])
    }));
  });
});
