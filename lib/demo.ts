import { computeCoverageGaps, priceInventory } from "@/lib/pricing";
import { createFeatureDefaults, timelineEntry } from "@/lib/claim-tools";
import type { ClaimJob, InventoryItem, PolicySummary } from "@/lib/types";

const now = () => new Date().toISOString();
const tomorrow = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

export const demoInventory: InventoryItem[] = [
  { id: "item-1", name: "Sectional sofa", category: "sofa", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Living room", confidence: "high", evidenceFrameIds: ["living-01"], notes: "Visible along north wall." },
  { id: "item-2", name: "55-inch television", category: "tv", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Living room", confidence: "high", evidenceFrameIds: ["living-01"], notes: "Brand is not legible." },
  { id: "item-3", name: "Area rug", category: "rug", brand: "unbranded", model: "unknown", quantity: 1, condition: "good", room: "Living room", confidence: "medium", evidenceFrameIds: ["living-01"], notes: "" },
  { id: "item-4", name: "Floor lamp", category: "lamp", brand: "unknown", model: "unknown", quantity: 2, condition: "good", room: "Living room", confidence: "medium", evidenceFrameIds: ["living-02"], notes: "Two lamps visible." },
  { id: "item-5", name: "Dining table", category: "dining table", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Dining room", confidence: "high", evidenceFrameIds: ["dining-01"], notes: "" },
  { id: "item-6", name: "Dining chair", category: "dining chair", brand: "unbranded", model: "unknown", quantity: 6, condition: "good", room: "Dining room", confidence: "high", evidenceFrameIds: ["dining-01"], notes: "Six chairs visible." },
  { id: "item-7", name: "Refrigerator", category: "refrigerator", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Kitchen", confidence: "high", evidenceFrameIds: ["kitchen-01"], notes: "Brand badge not readable." },
  { id: "item-8", name: "Countertop microwave", category: "microwave", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Kitchen", confidence: "high", evidenceFrameIds: ["kitchen-01"], notes: "" },
  { id: "item-9", name: "Cookware set", category: "cookware", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Kitchen", confidence: "medium", evidenceFrameIds: ["kitchen-02"], notes: "Visible on hanging rack and shelves." },
  { id: "item-10", name: "Queen mattress", category: "mattress", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Primary bedroom", confidence: "high", evidenceFrameIds: ["bedroom-01"], notes: "" },
  { id: "item-11", name: "Wood dresser", category: "dresser", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Primary bedroom", confidence: "high", evidenceFrameIds: ["bedroom-01"], notes: "" },
  { id: "item-12", name: "Laptop computer", category: "laptop", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Home office", confidence: "medium", evidenceFrameIds: ["office-01"], notes: "Model is not visible." },
  { id: "item-13", name: "Game console", category: "game console", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Living room", confidence: "medium", evidenceFrameIds: ["living-02"], notes: "" },
  { id: "item-14", name: "Diamond engagement ring", category: "jewelry", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Primary bedroom", confidence: "low", evidenceFrameIds: ["bedroom-02"], notes: "Value must be confirmed by receipt or appraisal." },
  { id: "item-15", name: "Gold necklace", category: "jewelry", brand: "unknown", model: "unknown", quantity: 1, condition: "good", room: "Primary bedroom", confidence: "low", evidenceFrameIds: ["bedroom-02"], notes: "Value must be confirmed by receipt or appraisal." },
  { id: "item-16", name: "Paperback books", category: "book", brand: "various", model: "unknown", quantity: 22, condition: "good", room: "Living room", confidence: "medium", evidenceFrameIds: ["living-03"], notes: "Count estimated from visible shelf." }
];

export const demoPolicy: PolicySummary = {
  contentsLimit: 50000,
  deductible: 1000,
  coverageBasis: "RCV",
  sourceName: "Sample Homeowner Policy (synthetic)",
  note: "Synthetic policy used for demonstration only.",
  findings: [
    { id: "policy-1", kind: "coverage", label: "Coverage C — Personal Property", amount: 50000, quote: "We will pay up to $50,000 for Coverage C — Personal Property.", page: 3, confidence: "high" },
    { id: "policy-2", kind: "coverage", label: "Replacement cost settlement", quote: "Covered personal property losses are settled at replacement cost, subject to the limits and conditions of this policy.", page: 4, confidence: "high" },
    { id: "policy-3", kind: "deductible", label: "All other perils deductible", amount: 1000, quote: "The deductible for all other perils is $1,000 per occurrence.", page: 2, confidence: "high" },
    { id: "policy-4", kind: "sublimit", label: "Jewelry sub-limit", amount: 1500, appliesTo: "jewelry", quote: "Our total liability for loss by theft of jewelry, watches, and furs is limited to $1,500.", page: 6, confidence: "high" },
    { id: "policy-5", kind: "sublimit", label: "Cash sub-limit", amount: 200, appliesTo: "cash", quote: "Our total liability for money is limited to $200.", page: 6, confidence: "high" },
    { id: "policy-6", kind: "exclusion", label: "Wear and tear exclusion", quote: "We do not insure for loss caused by wear and tear, marring, deterioration, or inherent vice.", page: 9, confidence: "high" }
  ]
};

export function createDemoJob(id: string): ClaimJob {
  const inventory = priceInventory(demoInventory);
  return {
    id,
    title: "Sample home contents claim",
    createdAt: now(),
    expiresAt: tomorrow(),
    mode: "demo",
    stages: {
      upload: { status: "complete", message: "Synthetic walkthrough and policy loaded." },
      inventory: { status: "complete", message: "16 contents items identified across five rooms." },
      policy: { status: "complete", message: "Policy limits and quoted terms extracted." },
      pricing: { status: "complete", message: "Curated replacement ranges and ACV estimates applied." },
      analysis: { status: "complete", message: "Coverage comparison complete." }
    },
    inventory,
    policy: demoPolicy,
    gaps: computeCoverageGaps(inventory, demoPolicy),
    sourceFrameCount: 6,
    ...createFeatureDefaults(),
    timeline: [timelineEntry("document", "Sample walkthrough analyzed", "Synthetic demo evidence loaded for this workspace.")]
  };
}
