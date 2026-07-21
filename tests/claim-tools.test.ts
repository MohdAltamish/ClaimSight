import { describe, expect, it } from "vitest";
import { correspondenceDraft, inventoryFromQuestionnaire, receiptMatchesFor } from "@/lib/claim-tools";
import { createDemoJob } from "@/lib/demo";

describe("memory intake and proof matching", () => {
  it("keeps uncertain fields unknown when building an inventory from memory", () => {
    const items = inventoryFromQuestionnaire("Kitchen: refrigerator, 4 dining chairs\nLiving room: TV");
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ room: "Kitchen", brand: "unknown", model: "unknown", condition: "unknown", category: "refrigerator" });
    expect(items[1].quantity).toBe(4);
  });

  it("creates a receipt match only when the receipt text clearly references an item", () => {
    const items = inventoryFromQuestionnaire("Living room: television");
    expect(receiptMatchesFor("receipt-1", "Television purchased for $499.00", items)).toHaveLength(1);
    expect(receiptMatchesFor("receipt-2", "Grocery total $40.00", items)).toEqual([]);
  });

  it("creates a review-only correspondence draft in the selected workspace language", () => {
    const job = createDemoJob("language-draft");
    job.profile.language = "hi";
    const draft = correspondenceDraft(job, "We need more documentation before we can decide.");
    expect(draft.language).toBe("hi");
    expect(draft.draft).toContain("लिखित स्पष्टीकरण");
    expect(draft.draft).toContain("कानूनी सलाह नहीं");
  });
});
