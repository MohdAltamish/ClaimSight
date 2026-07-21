import { describe, expect, it } from "vitest";
import { demoInventory, demoPolicy } from "@/lib/demo";
import { computeCoverageGaps, priceInventory, priceItem } from "@/lib/pricing";

describe("ClaimSight pricing", () => {
  it("returns a replacement range, ACV range, and high-value flag", () => {
    const item = demoInventory.find((candidate) => candidate.category === "jewelry");
    if (!item) throw new Error("Expected demo jewelry fixture.");
    const price = priceItem(item);
    expect(price.replacementHigh).toBeGreaterThan(price.replacementLow);
    expect(price.acvHigh).toBeLessThan(price.replacementHigh);
    expect(price.highValue).toBe(true);
  });

  it("flags the demo jewelry total above its confirmed policy sub-limit", () => {
    const priced = priceInventory(demoInventory);
    const gaps = computeCoverageGaps(priced, demoPolicy);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      category: "jewelry",
      sublimit: 1500,
      policyFindingId: "policy-4"
    });
    expect(gaps[0].estimatedGapHigh).toBeGreaterThan(0);
  });

  it("does not invent a gap where no matching policy sub-limit exists", () => {
    const priced = priceInventory(demoInventory.filter((item) => item.category === "tv"));
    expect(computeCoverageGaps(priced, demoPolicy)).toEqual([]);
  });
});
