"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, BookOpenCheck, Check, ChevronDown, CircleHelp, Clock3, FilePlus2, HandHeart, Languages, MailQuestion, ReceiptText, Send, ShieldAlert, UserRoundCheck } from "lucide-react";
import { demoExperts } from "@/lib/claim-tools";
import type { ClaimJob, DocumentCategory, JourneyStatus, TimelineType } from "@/lib/types";

type Props = { job: ClaimJob; secret: string; onJob: (job: ClaimJob) => void; onError: (message: string) => void; view: "tracker" | "documents" | "support" | "profile" };

export function ClaimCenter({ job, secret, onJob, onError, view }: Props) {
  const [busy, setBusy] = useState("");
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineDetail, setTimelineDetail] = useState("");
  const [timelineType, setTimelineType] = useState<TimelineType>("note");
  const [documentName, setDocumentName] = useState("");
  const [documentSummary, setDocumentSummary] = useState("");
  const [documentCategory, setDocumentCategory] = useState<DocumentCategory>("receipt");
  const [letter, setLetter] = useState("");
  const [reason, setReason] = useState("");
  const done = job.journey.filter((step) => step.status === "done").length;
  const nextStep = job.journey.find((step) => step.status !== "done");
  const latestDraft = job.correspondence.at(-1);
  const latestComplaint = job.complaints.at(-1);
  const matchedItemCount = new Set(job.receiptMatches.map((match) => match.itemId)).size;

  async function call(path: string, method: "POST" | "PATCH", body: unknown, label: string) {
    setBusy(label);
    try {
      const response = await fetch(`/api/jobs/${job.id}${path}`, { method, headers: { "Content-Type": "application/json", "x-job-secret": secret }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "This change could not be saved.");
      onJob(payload.job as ClaimJob);
      return payload;
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "This change could not be saved.");
      return null;
    } finally { setBusy(""); }
  }

  async function submitTimeline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!timelineTitle.trim()) return;
    const result = await call("/timeline", "POST", { type: timelineType, title: timelineTitle, detail: timelineDetail }, "timeline");
    if (result) { setTimelineTitle(""); setTimelineDetail(""); }
  }

  async function submitDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentName.trim()) return;
    const result = await call("/documents", "POST", { name: documentName, category: documentCategory, summary: documentSummary }, "document");
    if (result) { setDocumentName(""); setDocumentSummary(""); }
  }

  async function submitLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (letter.trim().length < 10) return;
    const result = await call("/correspondence", "POST", { letter }, "letter");
    if (result) setLetter("");
  }

  async function submitComplaint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 10) return;
    const result = await call("/complaints", "POST", { reason }, "complaint");
    if (result) setReason("");
  }

  const statusLabel = useMemo(() => job.profile.lossDate ? `Loss recorded ${job.profile.lossDate}` : "Add your loss date for a better claim record", [job.profile.lossDate]);
  const pageCopy = {
    tracker: { eyebrow: "Claim tracker", title: "Keep the next step clear.", description: "Record key events and keep your claim follow-ups organized." },
    documents: { eyebrow: "Document vault", title: "Keep proof ready to review.", description: "Register a receipt, policy, report, or correspondence summary in this temporary workspace." },
    support: { eyebrow: "Support options", title: "Prepare help without giving up control.", description: "Create drafts for your review and record consent before any human handoff." },
    profile: { eyebrow: "Claim profile", title: "Personalize this temporary workspace.", description: "These details stay in this anonymous workspace and can be deleted at any time." }
  }[view];

  return (
    <section className={`claim-center claim-center-${view}`} aria-labelledby="claim-center-heading">
      <div className="claim-center-page-heading">
        <div><span className="eyebrow">{pageCopy.eyebrow}</span><h2 id="claim-center-heading">{pageCopy.title}</h2><p>{pageCopy.description}</p></div>
        {view === "tracker" && <div className="journey-count"><strong>{done}/{job.journey.length}</strong><span>steps complete</span></div>}
      </div>

      {view === "tracker" && <section className="journey-panel" aria-label="Claim journey steps">
        {job.journey.map((step, index) => (
          <article className={`journey-step ${step.status}`} key={step.id}>
            <div className="journey-number">{step.status === "done" ? <Check size={14} /> : index + 1}</div>
            <div><h3>{step.title}</h3><p>{step.description}</p>{step.dueLabel && <small><Clock3 size={12} /> {step.dueLabel}</small>}{step.template && <details><summary>Use a plain-language template <ChevronDown size={13} /></summary><p className="journey-template">{step.template}</p></details>}</div>
            <select aria-label={`Status for ${step.title}`} value={step.status} disabled={busy === `step-${step.id}`} onChange={(event) => void call(`/journey/${step.id}`, "PATCH", { status: event.target.value as JourneyStatus }, `step-${step.id}`)}>
              <option value="pending">To do</option><option value="done">Done</option><option value="overdue">Needs attention</option>
            </select>
          </article>
        ))}
      </section>}

      <div className="claim-center-grid">
        {view === "profile" && <section className="center-card profile-card">
          <div className="center-card-heading"><div><span>Claim profile</span><h3>Personalize safely</h3></div><Languages size={19} /></div>
          <p className="center-note">Anonymous by default. These details are used only inside this temporary claim workspace.</p>
          <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void call("/profile", "PATCH", { state: form.get("state"), insurer: form.get("insurer"), claimNumber: form.get("claimNumber"), lossDate: form.get("lossDate"), language: form.get("language") }, "profile"); }} className="compact-form">
            <label>State / province<input name="state" defaultValue={job.profile.state} placeholder="e.g., California" /></label>
            <label>Insurer<input name="insurer" defaultValue={job.profile.insurer} placeholder="Optional" /></label>
            <label>Claim number<input name="claimNumber" defaultValue={job.profile.claimNumber} placeholder="Optional" /></label>
            <label>Date of loss<input name="lossDate" type="date" defaultValue={job.profile.lossDate} /></label>
            <label>Draft language<select name="language" defaultValue={job.profile.language}><option value="en">English</option><option value="hi">हिन्दी</option><option value="es">Español</option><option value="de">Deutsch</option></select></label>
            <button className="button button-ghost button-small" disabled={busy === "profile"}><UserRoundCheck size={15} /> Save profile</button>
          </form>
          <div className="status-line"><CircleHelp size={14} /> {statusLabel}</div>
        </section>}

        {view === "tracker" && <section className="center-card timeline-card">
          <div className="center-card-heading"><div><span>Status tracker</span><h3>Timeline & follow-ups</h3></div><BookOpenCheck size={19} /></div>
          <form onSubmit={submitTimeline} className="compact-form timeline-form">
            <label>What happened?<input value={timelineTitle} onChange={(event) => setTimelineTitle(event.target.value)} placeholder="e.g., Spoke with adjuster" required /></label>
            <label>Type<select value={timelineType} onChange={(event) => setTimelineType(event.target.value as TimelineType)}><option value="note">Note</option><option value="claim_notice">Claim notice</option><option value="submission">Submission</option><option value="insurer_response">Insurer response</option></select></label>
            <label className="span-all">Short detail<textarea value={timelineDetail} onChange={(event) => setTimelineDetail(event.target.value)} placeholder="What was said, requested, or promised?" /></label>
            <button className="button button-dark button-small" disabled={busy === "timeline"}><FilePlus2 size={15} /> Add to timeline</button>
          </form>
          <div className="timeline-list">{job.timeline.slice(-4).reverse().map((entry) => <article key={entry.id}><time>{entry.date}</time><div><strong>{entry.title}</strong><p>{entry.detail}</p></div></article>)}{!job.timeline.length && <p className="empty-mini">Add dated interactions and keep external emails or letters with your own records.</p>}</div>
        </section>}

        {view === "documents" && <section className="center-card vault-card">
          <div className="center-card-heading"><div><span>Document vault</span><h3>Receipts & proof register</h3></div><ReceiptText size={19} /></div>
          <p className="center-note">Register a short summary for a receipt, policy, adjuster report, or other proof. Receipt matches are suggestions only; confirm them before relying on them.</p>
          <form onSubmit={submitDocument} className="compact-form">
            <label>Document name<input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="e.g., TV receipt — May 2024" required /></label>
            <label>Type<select value={documentCategory} onChange={(event) => setDocumentCategory(event.target.value as DocumentCategory)}><option value="receipt">Receipt</option><option value="policy">Policy</option><option value="evidence">Photo or video evidence</option><option value="correspondence">Insurer correspondence</option><option value="adjuster_report">Adjuster report</option><option value="other">Other</option></select></label>
            <label className="span-all">Short summary<textarea value={documentSummary} onChange={(event) => setDocumentSummary(event.target.value)} placeholder="Keep only the details you want saved in this temporary workspace." /></label>
            <button className="button button-ghost button-small" disabled={busy === "document"}><ReceiptText size={15} /> Register document</button>
          </form>
          <div className="vault-stat"><strong>{job.documents.length}</strong><span>registered documents</span><b>{matchedItemCount} item{matchedItemCount === 1 ? "" : "s"} with possible receipt proof</b></div>
          <div className="document-list">{job.documents.slice().reverse().map((document) => <article key={document.id}><div><strong>{document.name}</strong><span>{document.category.replace(/_/g, " ")} · {document.source}</span></div><p>{document.extractedSummary || "No summary recorded."}</p></article>)}{!job.documents.length && <p className="empty-mini">No documents are registered yet. Add the proof you want to keep alongside this claim record.</p>}</div>
        </section>}

        {view === "documents" && <section className="center-card correspondence-card">
          <div className="center-card-heading"><div><span>Correspondence assistant</span><h3>Turn a letter into a reply draft</h3></div><MailQuestion size={19} /></div>
          <p className="center-note">The letter is classified locally in this MVP. The original letter text is not retained after a draft is created.</p>
          <form onSubmit={submitLetter} className="compact-form">
            <label className="span-all">Paste a short insurer letter excerpt<textarea value={letter} onChange={(event) => setLetter(event.target.value)} placeholder="Paste a decision, information request, or delay notice…" required /></label>
            <button className="button button-dark button-small" disabled={busy === "letter"}><Send size={15} /> Create review draft</button>
          </form>
          {latestDraft && <details className="draft-output"><summary>Latest {latestDraft.letterType.replace(/_/g, " ")} draft <ChevronDown size={13} /></summary><p>{latestDraft.summary}</p><pre>{latestDraft.draft}</pre></details>}
        </section>}
      </div>

      {view === "support" && <div className="claim-center-grid support-grid">
        <section className="center-card complaint-card">
          <div className="center-card-heading"><div><span>Escalation support</span><h3>Complaint draft assistant</h3></div><ShieldAlert size={19} /></div>
          <p className="center-note">Use this only after you have recorded the facts. ClaimSight creates a draft for your human review; it never sends a complaint or calculates legal deadlines.</p>
          <form onSubmit={submitComplaint} className="compact-form"><label className="span-all">Describe the concern<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: The insurer has not explained why two documented items were omitted." required /></label><button className="button button-ghost button-small" disabled={busy === "complaint"}><ShieldAlert size={15} /> Create human-review draft</button></form>
          {latestComplaint && <details className="draft-output complaint-output"><summary>Draft ready for human review <ChevronDown size={13} /></summary><p>Status: <strong>{latestComplaint.status.replace(/_/g, " ")}</strong> · Not sent to {latestComplaint.regulatorLabel}.</p><pre>{latestComplaint.draft}</pre></details>}
        </section>

        <section className="center-card expert-card">
          <div className="center-card-heading"><div><span>Human help</span><h3>Prepare a consent-based handoff</h3></div><HandHeart size={19} /></div>
          <p className="center-note">Directory entries are starting points, not endorsements. Verify licenses and terms yourself. This MVP records your request but does not transmit your data.</p>
          <div className="expert-list">{demoExperts.map((expert) => <article key={expert.id}><div><strong>{expert.name}</strong><span>{expert.focus}</span></div><button className="button button-ghost button-small" disabled={busy === expert.id} onClick={() => { if (window.confirm("Record your consent to prepare this request? ClaimSight will not contact or send data to anyone.")) void call("/experts", "POST", { expertId: expert.id, consent: true }, expert.id); }}>Record consent</button></article>)}</div>
          {job.expertHandoffs.length > 0 && <p className="consent-note"><Check size={15} /> {job.expertHandoffs.length} consent record{job.expertHandoffs.length === 1 ? "" : "s"} created. No external data has been sent.</p>}
        </section>
      </div>}

      {view === "tracker" && nextStep && <div className="next-step"><Clock3 size={17} /><span><strong>Next suggested action:</strong> {nextStep.title}</span></div>}
    </section>
  );
}
