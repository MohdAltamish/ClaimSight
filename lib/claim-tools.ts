import type {
  AuditEntry,
  ClaimComplaint,
  ClaimDocument,
  ClaimJob,
  ClaimJourneyStep,
  ClaimProfile,
  CorrespondenceDraft,
  CorrespondenceType,
  ExpertHandoff,
  InventoryItem,
  JourneyStatus,
  ReceiptMatch,
  TimelineEntry,
  TimelineType
} from "@/lib/types";

const today = () => new Date().toISOString();
const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function createClaimProfile(): ClaimProfile {
  return { state: "", insurer: "", claimNumber: "", lossDate: "", language: "en", identityMode: "anonymous" };
}

export function buildJourney(profile: ClaimProfile): ClaimJourneyStep[] {
  const insurer = profile.insurer ? ` with ${profile.insurer}` : "";
  return [
    {
      id: "notify-insurer",
      title: "Open or confirm the claim",
      description: `Notify the insurer${insurer} and record the claim number.`,
      status: "pending",
      dueLabel: "Check your policy and local rules for notice requirements.",
      template: "I am reporting a property contents loss. Please confirm my claim number, adjuster contact, and any inventory deadline in writing."
    },
    {
      id: "preserve-evidence",
      title: "Preserve evidence",
      description: "Keep photos, video, receipts, correspondence, and a dated loss timeline together.",
      status: "pending"
    },
    {
      id: "review-inventory",
      title: "Review the item inventory",
      description: "Correct unknown details, quantities, room assignments, and low-confidence entries before filing.",
      status: "pending"
    },
    {
      id: "submit-inventory",
      title: "Submit the reviewed inventory",
      description: "Export the review-ready inventory and retain a copy of what you send.",
      status: "pending",
      template: "Attached is my current contents inventory and supporting evidence. Please confirm receipt and identify any additional documentation you need."
    },
    {
      id: "track-response",
      title: "Track insurer responses",
      description: "Log calls and letters. Ask for requests, estimates, and decisions in writing.",
      status: "pending"
    },
    {
      id: "escalation-review",
      title: "Prepare escalation only if needed",
      description: "Create a human-reviewed complaint draft or seek qualified local help if a dispute remains.",
      status: "pending",
      dueLabel: "This tool does not calculate legal deadlines. Verify any deadline with a qualified local professional."
    }
  ];
}

export function createFeatureDefaults(): Pick<ClaimJob, "profile" | "journey" | "timeline" | "documents" | "receiptMatches" | "correspondence" | "complaints" | "expertHandoffs" | "auditLog"> {
  const profile = createClaimProfile();
  return { profile, journey: buildJourney(profile), timeline: [], documents: [], receiptMatches: [], correspondence: [], complaints: [], expertHandoffs: [], auditLog: [] };
}

export function addAudit(job: ClaimJob, action: string, actor: AuditEntry["actor"], detail: string) {
  job.auditLog = [...(job.auditLog ?? []), { id: createId(), action, actor, at: today(), detail }];
}

export function hydrateFeatureDefaults(job: ClaimJob): ClaimJob {
  const defaults = createFeatureDefaults();
  return {
    ...job,
    profile: job.profile ?? defaults.profile,
    journey: job.journey?.length ? job.journey : buildJourney(job.profile ?? defaults.profile),
    timeline: job.timeline ?? [],
    documents: job.documents ?? [],
    receiptMatches: job.receiptMatches ?? [],
    correspondence: job.correspondence ?? [],
    complaints: job.complaints ?? [],
    expertHandoffs: job.expertHandoffs ?? [],
    auditLog: job.auditLog ?? []
  };
}

const categoryHints: Array<[RegExp, string]> = [
  [/\b(tv|television)\b/i, "tv"], [/\b(laptop|macbook|notebook)\b/i, "laptop"],
  [/\b(fridge|refrigerator)\b/i, "refrigerator"], [/\b(microwave)\b/i, "microwave"],
  [/\b(sofa|couch|sectional)\b/i, "sofa"], [/\b(mattress)\b/i, "mattress"],
  [/\b(jewelry|ring|necklace|bracelet|earring)\b/i, "jewelry"], [/\b(watch)\b/i, "watch"],
  [/\b(camera)\b/i, "camera"], [/\b(bike|bicycle)\b/i, "bicycle"], [/\b(console|playstation|xbox|nintendo)\b/i, "game console"],
  [/\b(book|books)\b/i, "book"], [/\b(clothes|clothing|shirt|dress|coat)\b/i, "clothing"],
  [/\b(shoe|boots|sneaker)\b/i, "shoes"], [/\b(rug)\b/i, "rug"], [/\b(lamp)\b/i, "lamp"],
  [/\b(dresser)\b/i, "dresser"], [/\b(dining table|table)\b/i, "dining table"], [/\b(chair)\b/i, "dining chair"]
];

function categoryFor(text: string) {
  return categoryHints.find(([pattern]) => pattern.test(text))?.[1] ?? "household item";
}

function parseItem(text: string, room: string, index: number): InventoryItem | null {
  const clean = text.trim().replace(/^[•\-–]\s*/, "");
  if (!clean) return null;
  const quantityMatch = clean.match(/^(\d{1,2})\s+(.*)$/);
  const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
  const name = (quantityMatch ? quantityMatch[2] : clean).slice(0, 120).trim();
  if (!name) return null;
  return {
    id: `memory-${Date.now()}-${index}`,
    name,
    category: categoryFor(name),
    brand: "unknown",
    model: "unknown",
    quantity,
    condition: "unknown",
    room: room || "Room to review",
    confidence: "low",
    evidenceFrameIds: [],
    notes: "Added from memory intake. Review category, condition, and quantity before submitting.",
    verification: "estimated"
  };
}

export function inventoryFromQuestionnaire(answers: string): InventoryItem[] {
  const items: InventoryItem[] = [];
  let activeRoom = "Room to review";
  for (const rawLine of answers.split(/\n+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const roomLine = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (roomLine) {
      activeRoom = roomLine[1].trim();
      for (const part of roomLine[2].split(/[,;]+/)) {
        const item = parseItem(part, activeRoom, items.length + 1);
        if (item) items.push(item);
      }
      continue;
    }
    const item = parseItem(line, activeRoom, items.length + 1);
    if (item) items.push(item);
  }
  return items.slice(0, 100);
}

export function receiptMatchesFor(documentId: string, text: string, inventory: InventoryItem[]): ReceiptMatch[] {
  const amount = Number(text.match(/\$\s?([\d,]+(?:\.\d{2})?)/)?.[1]?.replace(/,/g, ""));
  const lower = text.toLowerCase();
  return inventory.flatMap((item) => {
    const words = item.name.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    const hit = words.some((word) => lower.includes(word));
    if (!hit) return [];
    return [{ id: createId(), documentId, itemId: item.id, confidence: "medium" as const, purchasePrice: Number.isFinite(amount) ? amount : undefined, note: "Possible item match from receipt text. Confirm before relying on it." }];
  });
}

export function classifyCorrespondence(letter: string): CorrespondenceType {
  const lower = letter.toLowerCase();
  if (/(deny|denial|not covered|decline)/.test(lower)) return "denial";
  if (/(offer|settlement|valuation|amount)/.test(lower)) return "low_offer";
  if (/(need|request|provide|documentation|information)/.test(lower)) return "information_request";
  if (/(delay|pending|still reviewing|time)/.test(lower)) return "delay";
  return "other";
}

export function correspondenceDraft(job: ClaimJob, letter: string): CorrespondenceDraft {
  const type = classifyCorrespondence(letter);
  const reference = job.profile.claimNumber ? `Claim ${job.profile.claimNumber}` : "my claim";
  const english = `Subject: ${reference} — request for written clarification\n\nHello,\n\nI am writing about ${reference}. I reviewed your recent communication and would like a written explanation of the specific policy language, facts, and calculations supporting the current position. Please also confirm any information you still need from me and the date by which you will respond.\n\nI am preserving my inventory, receipts, and correspondence and will provide relevant documentation after reviewing your request. This draft is for my review and is not legal advice.\n\nSincerely,\n[Your name]`;
  const spanish = `Asunto: ${reference} — solicitud de aclaración por escrito\n\nHola,\n\nEscribo sobre ${reference}. Solicito una explicación por escrito de la cláusula de póliza, los hechos y los cálculos que respaldan la posición actual. Confirmen también qué información necesitan y la fecha de respuesta.\n\nConservaré mi inventario, recibos y correspondencia. Este borrador requiere mi revisión y no constituye asesoramiento legal.\n\nAtentamente,\n[Su nombre]`;
  const hindi = `विषय: ${reference} — लिखित स्पष्टीकरण का अनुरोध\n\nनमस्ते,\n\nमैं ${reference} के संबंध में लिख रहा/रही हूँ। कृपया वर्तमान निर्णय के समर्थन में लागू पॉलिसी भाषा, तथ्यों और गणनाओं का लिखित स्पष्टीकरण दें। यह भी बताएं कि आपको मुझसे कौन-सी जानकारी चाहिए और आप किस तारीख तक उत्तर देंगे।\n\nमैं अपना इन्वेंटरी, रसीदें और पत्राचार सुरक्षित रख रहा/रही हूँ। यह मसौदा मेरी समीक्षा के लिए है और कानूनी सलाह नहीं है।\n\nसादर,\n[आपका नाम]`;
  const german = `Betreff: ${reference} — Bitte um schriftliche Klarstellung\n\nGuten Tag,\n\nich schreibe wegen ${reference}. Bitte erläutern Sie mir schriftlich die konkrete Policensprache, Fakten und Berechnungen, die Ihre aktuelle Position stützen. Bitte bestätigen Sie außerdem, welche Informationen Sie noch benötigen und bis wann Sie antworten werden.\n\nIch bewahre mein Inventar, meine Belege und meine Korrespondenz auf. Dieser Entwurf ist zur eigenen Prüfung bestimmt und keine Rechtsberatung.\n\nMit freundlichen Grüßen\n[Ihr Name]`;
  const drafts = { en: english, hi: hindi, es: spanish, de: german };
  return { id: createId(), letterType: type, summary: `Classified as ${type.replace(/_/g, " ")}; review the original before sending.`, draft: drafts[job.profile.language], language: job.profile.language, createdAt: today() };
}

export function complaintDraft(job: ClaimJob, reason: string): ClaimComplaint {
  const regulator = job.profile.state ? `${job.profile.state} insurance regulator` : "State insurance regulator";
  const timeline = job.timeline.slice(-4).map((event) => `• ${event.date}: ${event.title}`).join("\n") || "• Timeline entries have not yet been added.";
  const draft = `DRAFT FOR HUMAN REVIEW — DO NOT SUBMIT UNTIL YOU VERIFY THE FACTS AND THE CORRECT AGENCY.\n\nTo: ${regulator}\n\nI request a review of the handling of ${job.profile.claimNumber ? `claim ${job.profile.claimNumber}` : "my property claim"}. My concern: ${reason || "Please describe the concern precisely."}\n\nRelevant timeline:\n${timeline}\n\nI ask the insurer to provide its position, the applicable policy terms, and the basis for any valuation or delay. I understand this draft does not provide legal advice and has not been submitted by ClaimSight.\n\n[Policyholder name and contact information]`;
  return { id: createId(), status: "ready_for_human_review", regulatorLabel: regulator, reason: reason || "Concern to be completed by policyholder", draft, createdAt: today(), updatedAt: today() };
}

export const demoExperts = [
  { id: "expert-inventory", name: "Contents documentation specialist", state: "Remote", focus: "Inventory review and evidence organization" },
  { id: "expert-adjuster", name: "Public-adjuster referral directory", state: "Verify locally", focus: "Licensed public adjuster search" },
  { id: "expert-legal", name: "Policyholder attorney referral directory", state: "Verify locally", focus: "Coverage dispute consultation" }
];

export function expertHandoff(expertId: string, expertName: string, state: string): ExpertHandoff {
  return { id: createId(), expertId, expertName, state, consentedAt: today(), status: "requested" };
}

export function timelineEntry(type: TimelineType, title: string, detail: string, date?: string): TimelineEntry {
  return { id: createId(), type, title: title.slice(0, 120), detail: detail.slice(0, 1000), date: date || today().slice(0, 10), createdAt: today() };
}

export function setJourneyStatus(job: ClaimJob, id: string, status: JourneyStatus) {
  job.journey = job.journey.map((step) => step.id === id ? { ...step, status } : step);
}

export function recordedDocument(name: string, category: ClaimDocument["category"], source: ClaimDocument["source"], summary?: string, linkedItemIds: string[] = []): ClaimDocument {
  return { id: createId(), name: name.slice(0, 160), category, source, createdAt: today(), linkedItemIds, extractedSummary: summary?.slice(0, 800) };
}
