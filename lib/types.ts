export type Confidence = "high" | "medium" | "low";
export type Condition = "new" | "good" | "fair" | "poor" | "unknown";
export type CoverageBasis = "RCV" | "ACV" | "unknown";
export type JobStage = "upload" | "inventory" | "policy" | "pricing" | "analysis";
export type StageStatus = "waiting" | "running" | "complete" | "failed";

export interface PriceEstimate {
  replacementLow: number;
  replacementHigh: number;
  acvLow: number;
  acvHigh: number;
  basis: string;
  depreciationAssumption: string;
  highValue: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  quantity: number;
  condition: Condition;
  room: string;
  confidence: Confidence;
  evidenceFrameIds: string[];
  notes: string;
  price?: PriceEstimate;
  userEdited?: boolean;
  verification?: "estimated" | "receipt_verified";
  verifiedPurchasePrice?: number;
}

export interface PolicyFinding {
  id: string;
  kind: "coverage" | "deductible" | "sublimit" | "exclusion";
  label: string;
  amount?: number;
  appliesTo?: string;
  quote: string;
  page: number;
  confidence: Confidence;
}

export interface PolicySummary {
  contentsLimit?: number;
  deductible?: number;
  coverageBasis: CoverageBasis;
  findings: PolicyFinding[];
  sourceName: string;
  note?: string;
}

export interface CoverageGap {
  id: string;
  category: string;
  claimedReplacementLow: number;
  claimedReplacementHigh: number;
  sublimit: number;
  estimatedGapLow: number;
  estimatedGapHigh: number;
  policyFindingId: string;
}

export interface StageState {
  status: StageStatus;
  message?: string;
}

export interface ClaimJob {
  id: string;
  title: string;
  createdAt: string;
  /** null means the user opted into a persistent saved case. */
  expiresAt: string | null;
  savedCase?: SavedCase;
  mode: "demo" | "upload" | "questionnaire";
  stages: Record<JobStage, StageState>;
  inventory: InventoryItem[];
  policy?: PolicySummary;
  gaps: CoverageGap[];
  sourceFrameCount: number;
  profile: ClaimProfile;
  journey: ClaimJourneyStep[];
  timeline: TimelineEntry[];
  documents: ClaimDocument[];
  receiptMatches: ReceiptMatch[];
  correspondence: CorrespondenceDraft[];
  complaints: ClaimComplaint[];
  expertHandoffs: ExpertHandoff[];
  auditLog: AuditEntry[];
}

export interface SavedCase {
  caseReference: string;
  savedAt: string;
}

export interface ClaimProfile {
  state: string;
  insurer: string;
  claimNumber: string;
  lossDate: string;
  language: ClaimLanguage;
  identityMode: "anonymous" | "profile" | "saved_case";
}

export type ClaimLanguage = "en" | "hi" | "es" | "de";

export type JourneyStatus = "pending" | "done" | "overdue";

export interface ClaimJourneyStep {
  id: string;
  title: string;
  description: string;
  status: JourneyStatus;
  dueLabel?: string;
  template?: string;
}

export type TimelineType =
  | "claim_notice"
  | "submission"
  | "insurer_response"
  | "document"
  | "receipt"
  | "correspondence"
  | "complaint"
  | "expert_handoff"
  | "note";

export interface TimelineEntry {
  id: string;
  type: TimelineType;
  title: string;
  date: string;
  detail: string;
  createdAt: string;
}

export type DocumentCategory = "policy" | "evidence" | "receipt" | "correspondence" | "export" | "adjuster_report" | "other";

export interface ClaimDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  source: "uploaded" | "generated" | "recorded";
  createdAt: string;
  linkedItemIds: string[];
  extractedSummary?: string;
}

export interface ReceiptMatch {
  id: string;
  documentId: string;
  itemId: string;
  confidence: Confidence;
  purchasePrice?: number;
  purchaseDate?: string;
  note: string;
}

export type CorrespondenceType = "low_offer" | "information_request" | "delay" | "denial" | "other";

export interface CorrespondenceDraft {
  id: string;
  letterType: CorrespondenceType;
  summary: string;
  draft: string;
  language: ClaimLanguage;
  createdAt: string;
}

export type ComplaintStatus = "new" | "under_review" | "ready_for_human_review" | "resolved";

export interface ClaimComplaint {
  id: string;
  status: ComplaintStatus;
  regulatorLabel: string;
  reason: string;
  draft: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpertHandoff {
  id: string;
  expertId: string;
  expertName: string;
  state: string;
  consentedAt: string;
  status: "requested" | "cancelled";
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: "policyholder" | "admin" | "system";
  at: string;
  detail: string;
}

export interface JobCreation {
  job: ClaimJob;
  accessSecret: string;
  storage: "supabase" | "temporary-memory";
}
