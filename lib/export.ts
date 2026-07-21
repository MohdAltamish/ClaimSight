import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/pricing";
import type { ClaimJob } from "@/lib/types";

function cell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function claimCsv(job: ClaimJob) {
  const headers = [
    "Room", "Item", "Category", "Brand", "Model", "Quantity", "Condition", "Confidence",
    "Replacement low", "Replacement high", "ACV low", "ACV high", "Pricing basis", "Evidence", "Verification", "Verified purchase price", "Notes"
  ];
  const rows = job.inventory.map((item) => [
    item.room, item.name, item.category, item.brand, item.model, item.quantity, item.condition, item.confidence,
    item.price?.replacementLow ?? "", item.price?.replacementHigh ?? "", item.price?.acvLow ?? "", item.price?.acvHigh ?? "",
    item.price?.basis ?? "", item.evidenceFrameIds.join("; "), item.verification ?? "estimated", item.verifiedPurchasePrice ?? "", item.notes
  ]);
  return [headers, ...rows].map((row) => row.map(cell).join(",")).join("\n");
}

function addWrapped(doc: jsPDF, text: string, x: number, y: number, width = 170) {
  const lines = doc.splitTextToSize(text, width) as string[];
  doc.text(lines, x, y);
  return y + lines.length * 5;
}

export function claimPdf(job: ClaimJob) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let y = 16;
  doc.setFontSize(20);
  doc.text("ClaimSight contents claim report", 18, y);
  y += 9;
  doc.setFontSize(10);
  y = addWrapped(doc, "Review before filing. This estimate is based on visible evidence and illustrative replacement ranges; it does not guarantee insurer payment.", 18, y);
  y += 5;
  doc.setFontSize(13);
  doc.text("Inventory", 18, y);
  y += 7;
  doc.setFontSize(8);

  for (const item of job.inventory) {
    const line = item.room + " — " + item.quantity + " × " + item.name + " (" + item.brand + ", " + item.confidence + " confidence) | Replacement " + formatCurrency(item.price?.replacementLow) + "–" + formatCurrency(item.price?.replacementHigh) + " | ACV " + formatCurrency(item.price?.acvLow) + "–" + formatCurrency(item.price?.acvHigh) + (item.verification === "receipt_verified" ? " | receipt linked" : "");
    y = addWrapped(doc, line, 18, y);
    if (y > 250) { doc.addPage(); y = 16; }
  }

  if (job.policy) {
    doc.addPage();
    y = 16;
    doc.setFontSize(13);
    doc.text("Policy findings", 18, y);
    y += 7;
    doc.setFontSize(9);
    y = addWrapped(doc, "Contents: " + formatCurrency(job.policy.contentsLimit) + " | Deductible: " + formatCurrency(job.policy.deductible) + " | Settlement: " + job.policy.coverageBasis, 18, y);
    y += 4;
    for (const finding of job.policy.findings) {
      y = addWrapped(doc, finding.label + " (page " + finding.page + "): “" + finding.quote + "”", 18, y);
      y += 2;
      if (y > 250) { doc.addPage(); y = 16; }
    }
  }

  if (job.gaps.length) {
    y += 5;
    doc.setFontSize(13);
    doc.text("Coverage gap report", 18, y);
    y += 7;
    doc.setFontSize(9);
    for (const gap of job.gaps) {
      y = addWrapped(doc, gap.category + ": estimated replacement total " + formatCurrency(gap.claimedReplacementLow) + "–" + formatCurrency(gap.claimedReplacementHigh) + "; confirmed sub-limit " + formatCurrency(gap.sublimit) + "; estimated unrecoverable gap " + formatCurrency(gap.estimatedGapLow) + "–" + formatCurrency(gap.estimatedGapHigh) + ".", 18, y);
      y += 2;
    }
  }

  if (job.timeline.length || job.documents.length) {
    doc.addPage();
    y = 16;
    doc.setFontSize(13);
    doc.text("Claim record", 18, y);
    y += 7;
    doc.setFontSize(9);
    y = addWrapped(doc, "This temporary workspace may contain a user-maintained timeline and document register. Review it before filing; ClaimSight does not send correspondence or complaints.", 18, y);
    y += 5;
    for (const entry of job.timeline) {
      y = addWrapped(doc, entry.date + " — " + entry.title + (entry.detail ? ": " + entry.detail : ""), 18, y);
      y += 2;
      if (y > 250) { doc.addPage(); y = 16; }
    }
    if (job.documents.length) {
      y += 4;
      doc.setFontSize(11);
      doc.text("Registered documents", 18, y);
      y += 6;
      doc.setFontSize(9);
      for (const document of job.documents) {
        y = addWrapped(doc, document.category + " — " + document.name + (document.extractedSummary ? ": " + document.extractedSummary : ""), 18, y);
        y += 2;
        if (y > 250) { doc.addPage(); y = 16; }
      }
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}
