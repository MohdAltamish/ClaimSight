import type { CoverageGap, InventoryItem, PolicySummary, PriceEstimate } from "@/lib/types";

type CatalogEntry = {
  low: number;
  high: number;
  usefulLifeYears: number;
  basis: string;
};

const catalog: Record<string, CatalogEntry> = {
  sofa: { low: 800, high: 1600, usefulLifeYears: 10, basis: "mid-range upholstered sofa equivalents" },
  loveseat: { low: 550, high: 1100, usefulLifeYears: 10, basis: "mid-range upholstered loveseat equivalents" },
  "dining table": { low: 400, high: 950, usefulLifeYears: 12, basis: "solid-wood dining table equivalents" },
  "dining chair": { low: 85, high: 220, usefulLifeYears: 10, basis: "mid-range dining chair equivalents" },
  tv: { low: 350, high: 750, usefulLifeYears: 7, basis: "mid-range 55-inch 4K television retail range" },
  laptop: { low: 700, high: 1400, usefulLifeYears: 5, basis: "mid-range consumer laptop retail range" },
  "desktop computer": { low: 800, high: 1800, usefulLifeYears: 5, basis: "mid-range desktop computer retail range" },
  smartphone: { low: 500, high: 1100, usefulLifeYears: 4, basis: "current mainstream smartphone retail range" },
  tablet: { low: 300, high: 850, usefulLifeYears: 5, basis: "consumer tablet retail range" },
  camera: { low: 450, high: 1200, usefulLifeYears: 7, basis: "entry-to-mid mirrorless camera retail range" },
  refrigerator: { low: 850, high: 1800, usefulLifeYears: 13, basis: "standard refrigerator retail range" },
  microwave: { low: 120, high: 300, usefulLifeYears: 8, basis: "countertop microwave retail range" },
  cookware: { low: 180, high: 450, usefulLifeYears: 10, basis: "mid-range cookware set retail range" },
  mattress: { low: 700, high: 1400, usefulLifeYears: 8, basis: "queen mattress retail range" },
  "bed frame": { low: 250, high: 700, usefulLifeYears: 12, basis: "queen bed frame retail range" },
  dresser: { low: 350, high: 900, usefulLifeYears: 12, basis: "mid-range bedroom dresser retail range" },
  clothing: { low: 45, high: 120, usefulLifeYears: 4, basis: "average replacement range per garment" },
  shoes: { low: 70, high: 180, usefulLifeYears: 4, basis: "mid-range footwear replacement range" },
  jewelry: { low: 250, high: 2500, usefulLifeYears: 30, basis: "conservative jewelry equivalent range; receipt or appraisal recommended" },
  watch: { low: 120, high: 700, usefulLifeYears: 12, basis: "mid-range wristwatch retail range" },
  bicycle: { low: 400, high: 1100, usefulLifeYears: 8, basis: "adult commuter bicycle retail range" },
  "game console": { low: 400, high: 550, usefulLifeYears: 6, basis: "current-generation game console retail range" },
  speaker: { low: 120, high: 450, usefulLifeYears: 8, basis: "home speaker retail range" },
  vacuum: { low: 180, high: 550, usefulLifeYears: 7, basis: "upright or cordless vacuum retail range" },
  rug: { low: 150, high: 500, usefulLifeYears: 8, basis: "area rug retail range" },
  lamp: { low: 55, high: 180, usefulLifeYears: 8, basis: "table or floor lamp retail range" },
  book: { low: 12, high: 35, usefulLifeYears: 15, basis: "new paperback or hardcover replacement range" },
  art: { low: 150, high: 1200, usefulLifeYears: 20, basis: "decorative artwork range; appraisal recommended for originals" },
  firearm: { low: 450, high: 1200, usefulLifeYears: 20, basis: "firearm retail range; serial-number documentation recommended" },
  cash: { low: 1, high: 1, usefulLifeYears: 1, basis: "face value; policy sub-limits commonly apply" },
  appliance: { low: 150, high: 650, usefulLifeYears: 9, basis: "small household appliance retail range" },
  furniture: { low: 250, high: 900, usefulLifeYears: 10, basis: "mid-range household furniture retail range" },
  "household item": { low: 45, high: 200, usefulLifeYears: 7, basis: "mid-range household item retail range" }
};

const conditionMultipliers = { new: 1, good: 0.82, fair: 0.62, poor: 0.42, unknown: 0.72 };

function normalizedCategory(category: string) {
  const normalized = category.trim().toLowerCase();
  return catalog[normalized] ? normalized : "household item";
}

export function priceItem(item: InventoryItem): PriceEstimate {
  const requestedCategory = item.category.trim().toLowerCase();
  const category = normalizedCategory(item.category);
  const entry = catalog[category];
  const quantity = Math.max(1, item.quantity);
  const replacementLow = Math.round(entry.low * quantity);
  const replacementHigh = Math.round(entry.high * quantity);
  const ageRetention = Math.max(0.3, 1 - Math.min(0.62, 5 / entry.usefulLifeYears));
  const condition = conditionMultipliers[item.condition];
  const acvLow = Math.max(0, Math.round(replacementLow * ageRetention * condition * 0.9));
  const acvHigh = Math.max(acvLow, Math.round(replacementHigh * ageRetention * condition * 1.08));

  return {
    replacementLow,
    replacementHigh,
    acvLow,
    acvHigh,
    basis: requestedCategory !== category ? `${entry.basis}; catalog fallback for an unrecognized category — verify a comparable replacement.` : entry.basis,
    depreciationAssumption: "Age unknown; estimated using a " + entry.usefulLifeYears + "-year category life and " + item.condition + " condition.",
    highValue: replacementHigh > 1000
  };
}

export function priceInventory(items: InventoryItem[]) {
  return items.map((item) => ({ ...item, price: priceItem(item) }));
}

function matchingSublimit(category: string, policy: PolicySummary) {
  const normalized = category.toLowerCase();
  return policy.findings.find(
    (finding) =>
      finding.kind === "sublimit" &&
      typeof finding.amount === "number" &&
      normalized.includes((finding.appliesTo ?? "").toLowerCase())
  );
}

export function computeCoverageGaps(items: InventoryItem[], policy?: PolicySummary): CoverageGap[] {
  if (!policy) return [];
  const totals = new Map<string, { low: number; high: number }>();
  for (const item of items) {
    if (!item.price) continue;
    const key = normalizedCategory(item.category);
    const current = totals.get(key) ?? { low: 0, high: 0 };
    current.low += item.price.replacementLow;
    current.high += item.price.replacementHigh;
    totals.set(key, current);
  }

  return [...totals.entries()].flatMap(([category, total]) => {
    const sublimit = matchingSublimit(category, policy);
    if (!sublimit?.amount || total.high <= sublimit.amount) return [];
    return [{
      id: "gap-" + category,
      category,
      claimedReplacementLow: total.low,
      claimedReplacementHigh: total.high,
      sublimit: sublimit.amount,
      estimatedGapLow: Math.max(0, total.low - sublimit.amount),
      estimatedGapHigh: Math.max(0, total.high - sublimit.amount),
      policyFindingId: sublimit.id
    }];
  });
}

export function formatCurrency(amount?: number) {
  if (typeof amount !== "number") return "Unknown";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}
