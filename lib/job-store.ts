import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createFeatureDefaults, hydrateFeatureDefaults } from "@/lib/claim-tools";
import type { ClaimJob, JobCreation, SavedCase } from "@/lib/types";

type StoredJob = {
  job: ClaimJob;
  secretHash: string;
};

declare global {
  // eslint-disable-next-line no-var
  var claimsightJobs: Map<string, StoredJob> | undefined;
}

const memoryJobs = global.claimsightJobs ?? new Map<string, StoredJob>();
global.claimsightJobs = memoryJobs;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = url && serviceRole ? createClient(url, serviceRole, { auth: { persistSession: false } }) : null;

function hash(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function hashesMatch(storedHash: string, secret: string) {
  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hash(secret), "hex");
  return expected.length === actual.length && expected.length > 0 && timingSafeEqual(expected, actual);
}

function isExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() < Date.now());
}

const caseAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const caseReferencePattern = /^CS-(?:[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-){3}[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

export function normalizeCaseReference(value: string) {
  return value.trim().toUpperCase();
}

export function isCaseReference(value: string) {
  return caseReferencePattern.test(normalizeCaseReference(value));
}

function createCaseReference() {
  const bytes = randomBytes(16);
  const groups = Array.from({ length: 4 }, (_, group) =>
    Array.from({ length: 4 }, (_, index) => caseAlphabet[bytes[group * 4 + index] & 31]).join("")
  );
  return `CS-${groups.join("-")}`;
}

function savedCaseFromRecord(caseReference: string | null, savedAt: string | null): SavedCase | undefined {
  if (!caseReference || !savedAt) return undefined;
  return { caseReference, savedAt };
}

function hydrateStoredJob(job: ClaimJob, expiresAt: string | null, caseReference?: string | null, savedAt?: string | null) {
  const hydrated = hydrateFeatureDefaults(job);
  hydrated.expiresAt = expiresAt;
  const savedCase = savedCaseFromRecord(caseReference ?? null, savedAt ?? null);
  if (savedCase) {
    hydrated.savedCase = savedCase;
    hydrated.profile.identityMode = "saved_case";
  }
  return hydrated;
}

export function hasSupabaseStorage() {
  return Boolean(supabase);
}

function blankJob(id: string, mode: "demo" | "upload" | "questionnaire", title: string): ClaimJob {
  const createdAt = new Date().toISOString();
  return {
    id,
    title,
    createdAt,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    mode,
    stages: {
      upload: { status: mode === "upload" ? "waiting" : "complete" },
      inventory: { status: "waiting" },
      policy: { status: "waiting" },
      pricing: { status: "waiting" },
      analysis: { status: "waiting" }
    },
    inventory: [],
    gaps: [],
    sourceFrameCount: 0,
    ...createFeatureDefaults()
  };
}

export async function createJob(mode: "demo" | "upload" | "questionnaire", title?: string): Promise<JobCreation> {
  const id = randomUUID();
  const accessSecret = randomBytes(24).toString("base64url");
  const job = blankJob(id, mode, title?.slice(0, 100) || (mode === "demo" ? "Sample home contents claim" : mode === "questionnaire" ? "Memory-built contents claim" : "Untitled contents claim"));
  const secretHash = hash(accessSecret);

  if (supabase) {
    const { error } = await supabase.from("jobs").insert({
      id,
      access_secret_hash: secretHash,
      status: "created",
      expires_at: job.expiresAt,
      payload: job
    });
    if (error) throw new Error("Could not create temporary claim workspace: " + error.message);
  } else {
    memoryJobs.set(id, { job, secretHash });
  }

  return { job, accessSecret, storage: supabase ? "supabase" : "temporary-memory" };
}

export async function getJob(id: string, accessSecret: string): Promise<ClaimJob | null> {
  if (supabase) {
    const { data, error } = await supabase.from("jobs").select("payload,access_secret_hash,expires_at,case_reference,saved_at").eq("id", id).maybeSingle();
    if (error || !data || !hashesMatch(data.access_secret_hash, accessSecret) || isExpired(data.expires_at)) return null;
    return hydrateStoredJob(data.payload as ClaimJob, data.expires_at, data.case_reference, data.saved_at);
  }

  const stored = memoryJobs.get(id);
  if (!stored || !hashesMatch(stored.secretHash, accessSecret) || isExpired(stored.job.expiresAt)) return null;
  return hydrateFeatureDefaults(stored.job);
}

export async function saveJob(job: ClaimJob, accessSecret: string) {
  const secretHash = hash(accessSecret);
  if (supabase) {
    const { data, error } = await supabase.from("jobs").select("access_secret_hash").eq("id", job.id).maybeSingle();
    if (error || !data || !hashesMatch(data.access_secret_hash, accessSecret)) throw new Error("Claim workspace is unavailable or has expired.");

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        payload: job,
        status: job.savedCase ? "saved" : job.stages.analysis.status,
        expires_at: job.expiresAt,
        case_reference: job.savedCase?.caseReference ?? null,
        saved_at: job.savedCase?.savedAt ?? null
      })
      .eq("id", job.id);
    if (updateError) throw new Error("Could not save claim workspace: " + updateError.message);

    await supabase.from("inventory_items").delete().eq("job_id", job.id);
    if (job.inventory.length) {
      const { error: inventoryError } = await supabase.from("inventory_items").insert(
        job.inventory.map((item) => ({ job_id: job.id, item_id: item.id, payload: item }))
      );
      if (inventoryError) throw new Error("Could not save inventory: " + inventoryError.message);
    }
    await supabase.from("policy_findings").delete().eq("job_id", job.id);
    if (job.policy?.findings.length) {
      const { error: policyError } = await supabase.from("policy_findings").insert(
        job.policy.findings.map((finding) => ({ job_id: job.id, finding_id: finding.id, payload: finding }))
      );
      if (policyError) throw new Error("Could not save policy findings: " + policyError.message);
    }
    return;
  }

  const stored = memoryJobs.get(job.id);
  if (!stored || !hashesMatch(stored.secretHash, accessSecret)) throw new Error("Claim workspace is unavailable or has expired.");
  memoryJobs.set(job.id, { job, secretHash });
}

export type SavedCaseResult = {
  job: ClaimJob;
  caseReference: string;
  created: boolean;
};

/** Promote an authorized temporary workspace into a persistent Supabase case. */
export async function saveCase(job: ClaimJob, accessSecret: string): Promise<SavedCaseResult> {
  if (!supabase) throw new Error("Saving a case requires configured Supabase storage.");

  const { data: existing, error: existingError } = await supabase
    .from("jobs")
    .select("access_secret_hash,case_reference,saved_at")
    .eq("id", job.id)
    .maybeSingle();
  if (existingError || !existing || !hashesMatch(existing.access_secret_hash, accessSecret)) {
    throw new Error("Claim workspace is unavailable or has expired.");
  }

  if (existing.case_reference && existing.saved_at) {
    job.expiresAt = null;
    job.savedCase = { caseReference: existing.case_reference, savedAt: existing.saved_at };
    job.profile.identityMode = "saved_case";
    await saveJob(job, accessSecret);
    return { job, caseReference: existing.case_reference, created: false };
  }

  const savedAt = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const caseReference = createCaseReference();
    job.expiresAt = null;
    job.savedCase = { caseReference, savedAt };
    job.profile.identityMode = "saved_case";
    const { data, error } = await supabase
      .from("jobs")
      .update({ payload: job, status: "saved", expires_at: null, case_reference: caseReference, saved_at: savedAt })
      .eq("id", job.id)
      .eq("access_secret_hash", hash(accessSecret))
      .is("case_reference", null)
      .select("case_reference")
      .maybeSingle();

    if (!error && data?.case_reference) return { job, caseReference: data.case_reference, created: true };
    if (error?.code === "23505") continue;

    const { data: raced } = await supabase
      .from("jobs")
      .select("case_reference,saved_at")
      .eq("id", job.id)
      .maybeSingle();
    if (raced?.case_reference && raced.saved_at) {
      job.expiresAt = null;
      job.savedCase = { caseReference: raced.case_reference, savedAt: raced.saved_at };
      job.profile.identityMode = "saved_case";
      return { job, caseReference: raced.case_reference, created: false };
    }
    throw new Error("Could not save this case. Please try again.");
  }

  throw new Error("Could not assign a Case ID. Please try again.");
}

/** Restore a case with its user-facing Case ID and private recovery code. */
export async function getSavedCase(caseReference: string, recoveryCode: string): Promise<ClaimJob | null> {
  if (!supabase || !isCaseReference(caseReference)) return null;
  const { data, error } = await supabase
    .from("jobs")
    .select("payload,access_secret_hash,expires_at,case_reference,saved_at")
    .eq("case_reference", normalizeCaseReference(caseReference))
    .maybeSingle();
  if (error || !data || !data.saved_at || isExpired(data.expires_at) || !hashesMatch(data.access_secret_hash, recoveryCode)) return null;
  return hydrateStoredJob(data.payload as ClaimJob, data.expires_at, data.case_reference, data.saved_at);
}

export async function deleteJob(id: string, accessSecret: string) {
  if (supabase) {
    const { data } = await supabase.from("jobs").select("access_secret_hash").eq("id", id).maybeSingle();
    if (!data || !hashesMatch(data.access_secret_hash, accessSecret)) return false;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    return !error;
  }
  const stored = memoryJobs.get(id);
  if (!stored || !hashesMatch(stored.secretHash, accessSecret)) return false;
  memoryJobs.delete(id);
  return true;
}

export async function cleanupExpiredJobs() {
  const now = new Date();
  if (supabase) {
    const { error } = await supabase.from("jobs").delete().lt("expires_at", now.toISOString());
    if (error) throw new Error("Cleanup failed: " + error.message);
    return;
  }
  for (const [id, stored] of memoryJobs) {
    if (isExpired(stored.job.expiresAt)) memoryJobs.delete(id);
  }
}

export async function listJobsForAdmin(): Promise<ClaimJob[]> {
  const now = new Date().toISOString();
  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("payload,expires_at,case_reference,saved_at")
      .or(`expires_at.is.null,expires_at.gte.${now}`)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Could not load the review queue: " + error.message);
    return (data ?? []).map((entry) => hydrateStoredJob(entry.payload as ClaimJob, entry.expires_at, entry.case_reference, entry.saved_at));
  }
  return [...memoryJobs.values()]
    .map((stored) => hydrateFeatureDefaults(stored.job))
    .filter((job) => !isExpired(job.expiresAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getJobForAdmin(id: string): Promise<ClaimJob | null> {
  if (supabase) {
    const { data, error } = await supabase.from("jobs").select("payload,expires_at,case_reference,saved_at").eq("id", id).maybeSingle();
    if (error || !data || isExpired(data.expires_at)) return null;
    return hydrateStoredJob(data.payload as ClaimJob, data.expires_at, data.case_reference, data.saved_at);
  }
  const stored = memoryJobs.get(id);
  if (!stored || isExpired(stored.job.expiresAt)) return null;
  return hydrateFeatureDefaults(stored.job);
}

export async function saveJobAsAdmin(job: ClaimJob) {
  if (supabase) {
    const { error } = await supabase.from("jobs").update({
      payload: job,
      status: job.savedCase ? "saved" : job.stages.analysis.status,
      expires_at: job.expiresAt,
      case_reference: job.savedCase?.caseReference ?? null,
      saved_at: job.savedCase?.savedAt ?? null
    }).eq("id", job.id);
    if (error) throw new Error("Could not save the review action: " + error.message);
    return;
  }
  const stored = memoryJobs.get(job.id);
  if (!stored) throw new Error("Claim workspace is unavailable or has expired.");
  memoryJobs.set(job.id, { job, secretHash: stored.secretHash });
}
