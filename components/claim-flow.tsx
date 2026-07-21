"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle, BadgeCheck, Check, ChevronRight, Download, Eye, FileCheck2, FileText, ImageIcon, LoaderCircle,
  LockKeyhole, Pencil, ReceiptText, RefreshCw, ScanSearch, ShieldCheck, Sparkles, Trash2, Upload, Video, Waves, Wind, Flame, CircleHelp, X, LayoutDashboard, ListChecks, ChartNoAxesCombined, ListTodo, UserRound, HandHeart
} from "lucide-react";
import { formatCurrency } from "@/lib/pricing";
import type { ClaimJob, InventoryItem, JobCreation, JobStage } from "@/lib/types";
import { ClaimCenter } from "@/components/claim-center";
import { MemoryIntakeAgent } from "@/components/memory-intake-agent";
import { useLanguage } from "@/components/language-provider";

const stages: Array<{ key: JobStage; label: string }> = [
  { key: "upload", label: "Evidence" },
  { key: "inventory", label: "Inventory" },
  { key: "policy", label: "Policy" },
  { key: "pricing", label: "Pricing" },
  { key: "analysis", label: "Coverage" }
];

type ApiResult = { job: ClaimJob };
type CapabilityResult = { liveAnalysis: boolean };
type ReviewFilter = "all" | "needs-review" | "high-value";
type WorkspaceView = "dashboard" | "inventory" | "policy" | "coverage" | "tracker" | "documents" | "support" | "profile" | "exports";

const workspaceViews: Array<{ id: WorkspaceView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "inventory", label: "Inventory", icon: ListChecks },
  { id: "policy", label: "Policy", icon: FileText },
  { id: "coverage", label: "Coverage", icon: ChartNoAxesCombined },
  { id: "tracker", label: "Tracker", icon: ListTodo },
  { id: "documents", label: "Documents", icon: ReceiptText },
  { id: "support", label: "Support", icon: HandHeart },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "exports", label: "Export", icon: Download }
];

async function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function averageHash(canvas: HTMLCanvasElement) {
  const tiny = document.createElement("canvas");
  tiny.width = 8;
  tiny.height = 8;
  const context = tiny.getContext("2d", { willReadFrequently: true });
  if (!context) return "";
  context.drawImage(canvas, 0, 0, 8, 8);
  const pixels = context.getImageData(0, 0, 8, 8).data;
  const values = Array.from({ length: 64 }, (_, index) => {
    const offset = index * 4;
    return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
  });
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.map((value) => (value > average ? "1" : "0")).join("");
}

function hashDistance(a: string, b: string) {
  return [...a].reduce((sum, value, index) => sum + Number(value !== b[index]), 0);
}

async function sampleVideoFrames(file: File) {
  const video = document.createElement("video");
  const objectUrl = URL.createObjectURL(file);
  video.preload = "metadata";
  video.muted = true;
  video.src = objectUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("This video could not be sampled in your browser."));
  });
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
  canvas.width = Math.max(1, Math.round(video.videoWidth * ratio));
  canvas.height = Math.max(1, Math.round(video.videoHeight * ratio));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare video frames.");

  const sampleCount = Math.min(12, Math.max(1, Math.ceil(video.duration / 8)));
  const times = Array.from({ length: sampleCount }, (_, index) => {
    return Math.min(Math.max(0.1, video.duration - 0.1), (video.duration / (sampleCount + 1)) * (index + 1));
  });
  const frames: string[] = [];
  const hashes: string[] = [];
  for (const time of times) {
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = time;
    });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const hash = averageHash(canvas);
    if (!hashes.some((previous) => hashDistance(previous, hash) < 8)) {
      hashes.push(hash);
      frames.push(canvas.toDataURL("image/jpeg", 0.78));
    }
  }
  URL.revokeObjectURL(objectUrl);
  return frames;
}

async function collectFrames(files: File[]) {
  const frames: string[] = [];
  for (const file of files) {
    if (file.type.startsWith("image/")) frames.push(await dataUrl(file));
    if (file.type.startsWith("video/")) frames.push(...(await sampleVideoFrames(file)));
  }
  return frames.slice(0, 12);
}

function groupByRoom(items: InventoryItem[]) {
  return items.reduce<Record<string, InventoryItem[]>>((groups, item) => {
    groups[item.room] = [...(groups[item.room] ?? []), item];
    return groups;
  }, {});
}

export function ClaimFlow() {
  const pathname = usePathname();
  const router = useRouter();
  const { text, language } = useLanguage();
  const routeView = pathname.split("/")[2] as WorkspaceView | undefined;
  const activeView: WorkspaceView = workspaceViews.some((view) => view.id === routeView) ? routeView! : "dashboard";
  const lossTypes = useMemo(() => [
    { id: "fire" as const, label: text.lossTypes[0], icon: Flame },
    { id: "water" as const, label: text.lossTypes[1], icon: Waves },
    { id: "storm" as const, label: text.lossTypes[2], icon: Wind },
    { id: "other" as const, label: text.lossTypes[3], icon: CircleHelp }
  ], [text.lossTypes]);
  const [job, setJob] = useState<ClaimJob | null>(null);
  const [secret, setSecret] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [policyFile, setPolicyFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [lossType, setLossType] = useState("fire");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restoring, setRestoring] = useState(true);
  const mediaRef = useRef<HTMLInputElement>(null);
  const policyRef = useRef<HTMLInputElement>(null);
  const filteredInventory = useMemo(() => {
    const items = job?.inventory ?? [];
    if (reviewFilter === "needs-review") return items.filter((item) => item.confidence === "low" || item.price?.highValue);
    if (reviewFilter === "high-value") return items.filter((item) => item.price?.highValue);
    return items;
  }, [job, reviewFilter]);
  const rooms = useMemo(() => groupByRoom(filteredInventory), [filteredInventory]);
  const claimBrief = useMemo(() => {
    const items = job?.inventory ?? [];
    const reviewItems = items.filter((item) => item.confidence === "low" || item.price?.highValue);
    const lowConfidenceItems = items.filter((item) => item.confidence === "low");
    const highValueItems = items.filter((item) => item.price?.highValue);
    const pricedItems = items.filter((item) => item.price).length;
    const citedTerms = job?.policy?.findings.filter((finding) => finding.quote && finding.page).length ?? 0;
    const upperReplacement = items.reduce((sum, item) => sum + (item.price?.replacementHigh ?? 0), 0);
    return {
      upperReplacement,
      roomCount: Object.keys(groupByRoom(items)).length,
      reviewItems: reviewItems.length,
      lowConfidenceItems: lowConfidenceItems.length,
      highValueItems: highValueItems.length,
      pricedItems,
      citedTerms
    };
  }, [job]);

  useEffect(() => {
    let active = true;
    const saved = sessionStorage.getItem("claimsight-active-workspace");
    if (!saved) {
      setRestoring(false);
      return;
    }
    try {
      const { id, accessSecret } = JSON.parse(saved) as { id?: string; accessSecret?: string };
      if (!id || !accessSecret) throw new Error("Invalid saved workspace");
      void fetch("/api/jobs/" + id, { headers: { "x-job-secret": accessSecret } })
        .then(async (response) => {
          if (!response.ok) throw new Error("Workspace is no longer available");
          const result = await response.json() as ApiResult;
          if (!active) return;
          setSecret(accessSecret);
          setJob(result.job);
          const savedNotice = sessionStorage.getItem("claimsight-workspace-notice-" + id);
          if (savedNotice) {
            setNotice(savedNotice);
            sessionStorage.removeItem("claimsight-workspace-notice-" + id);
          }
        })
        .catch(() => sessionStorage.removeItem("claimsight-active-workspace"))
        .finally(() => { if (active) setRestoring(false); });
    } catch {
      sessionStorage.removeItem("claimsight-active-workspace");
      setRestoring(false);
    }
    return () => { active = false; };
  }, []);

  async function requestApi(path: string, init: RequestInit = {}) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(secret ? { "x-job-secret": secret } : {}),
        ...init.headers
      }
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Something went wrong.");
    }
    return response;
  }

  function captureCreation(created: JobCreation) {
    setSecret(created.accessSecret);
    sessionStorage.setItem("claimsight-secret-" + created.job.id, created.accessSecret);
    sessionStorage.setItem("claimsight-active-workspace", JSON.stringify({ id: created.job.id, accessSecret: created.accessSecret }));
    setJob(created.job);
    router.replace("/claim/dashboard");
  }

  function focusReview(filter: ReviewFilter) {
    setReviewFilter(filter);
    router.push("/claim/inventory");
  }

  async function startDemo(demoNotice = "") {
    setWorking(true);
    setError("");
    setNotice(demoNotice);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "demo" })
      });
      if (!response.ok) throw new Error("Could not start the sample claim.");
      const created: JobCreation = await response.json();
      if (demoNotice) sessionStorage.setItem("claimsight-workspace-notice-" + created.job.id, demoNotice);
      captureCreation(created);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the sample claim.");
    } finally {
      setWorking(false);
    }
  }

  async function startUpload() {
    if (!mediaFiles.length) {
      setError("Choose at least one photo or walkthrough video to continue.");
      return;
    }

    // A video alone is a useful way to demonstrate the app. Keep it local and
    // open the synthetic sample instead of implying that the video was analyzed.
    if (!policyFile) {
      await startDemo("Demo mode opened. Your selected video stayed on this device and was not analyzed; this workspace uses synthetic sample evidence and policy data.");
      return;
    }

    let liveAnalysis = false;
    try {
      const capability = await fetch("/api/jobs?capability=live-analysis");
      if (capability.ok) liveAnalysis = (await capability.json() as CapabilityResult).liveAnalysis;
    } catch {
      // The live request below will surface a useful error if the app cannot reach the server.
    }
    if (!liveAnalysis) {
      await startDemo("Demo mode opened because live AI analysis is not configured on this deployment. Your selected files stayed on this device; this workspace uses synthetic sample evidence and policy data.");
      return;
    }

    const totalBytes = [...mediaFiles, policyFile].reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > 60 * 1024 * 1024) {
      setError("Keep the combined files under 60 MB for this MVP.");
      return;
    }
    if (policyFile.size > 4 * 1024 * 1024) {
      setError("For hosted analysis, use a text-based policy PDF under 4 MB.");
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");
    try {
      const create = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "upload", title: (lossTypes.find((type) => type.id === lossType)?.label ?? "Uploaded") + " contents claim" })
      });
      if (!create.ok) throw new Error("Could not create the temporary workspace.");
      const created: JobCreation = await create.json();
      captureCreation(created);
      const frames = await collectFrames(mediaFiles);
      if (!frames.length) throw new Error("No usable photo or video frame could be prepared.");
      const policyBase64 = await dataUrl(policyFile);
      const headers = { "Content-Type": "application/json", "x-job-secret": created.accessSecret };
      const inventory = await fetch("/api/jobs/" + created.job.id + "/extract-inventory", {
        method: "POST", headers, body: JSON.stringify({ frames })
      });
      if (!inventory.ok) throw new Error((await inventory.json()).error || "Inventory extraction failed.");
      setJob((await inventory.json() as ApiResult).job);
      const policy = await fetch("/api/jobs/" + created.job.id + "/parse-policy", {
        method: "POST", headers, body: JSON.stringify({ pdfBase64: policyBase64, sourceName: policyFile.name })
      });
      if (!policy.ok) throw new Error((await policy.json()).error || "Policy parsing failed.");
      setJob((await policy.json() as ApiResult).job);
      const price = await fetch("/api/jobs/" + created.job.id + "/price", { method: "POST", headers });
      if (!price.ok) throw new Error((await price.json()).error || "Pricing failed.");
      setJob((await price.json() as ApiResult).job);
      const analysis = await fetch("/api/jobs/" + created.job.id + "/analyze", { method: "POST", headers });
      if (!analysis.ok) throw new Error((await analysis.json()).error || "Coverage comparison failed.");
      setJob((await analysis.json() as ApiResult).job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload processing failed.");
    } finally {
      setWorking(false);
    }
  }

  async function startMemoryIntake(details: { answers: string; state: string; insurer: string; lossDate: string }) {
    if (details.answers.trim().length < 3) {
      setError("List at least one item, for example: Kitchen: refrigerator, 4 dining chairs.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const create = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "questionnaire", title: "Memory-built contents claim" }) });
      if (!create.ok) throw new Error("Could not create the temporary workspace.");
      const created: JobCreation = await create.json();
      captureCreation(created);
      const response = await fetch(`/api/jobs/${created.job.id}/questionnaire`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-job-secret": created.accessSecret },
        body: JSON.stringify({ ...details, language })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not build the memory inventory.");
      setJob(payload.job as ClaimJob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not build the memory inventory.");
    } finally { setWorking(false); }
  }

  async function refresh() {
    if (!job) return;
    try {
      const response = await requestApi("/api/jobs/" + job.id);
      setJob((await response.json() as ApiResult).job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not refresh this claim.");
    }
  }

  async function saveItem(item: InventoryItem, patch: Partial<InventoryItem>) {
    if (!job) return;
    try {
      const response = await requestApi("/api/jobs/" + job.id + "/items/" + item.id, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });
      setJob((await response.json() as ApiResult).job);
      setEditing(null);
      setSelectedItem(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save that edit.");
    }
  }

  async function download(format: "csv" | "pdf") {
    if (!job) return;
    try {
      const response = await requestApi("/api/jobs/" + job.id + "/export?format=" + format);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "csv" ? "claimsight-inventory.csv" : "claimsight-claim-report.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the export.");
    }
  }

  async function removeJob() {
    if (!job) return;
    try {
      await requestApi("/api/jobs/" + job.id, { method: "DELETE" });
      sessionStorage.removeItem("claimsight-secret-" + job.id);
      sessionStorage.removeItem("claimsight-active-workspace");
      setJob(null);
      setSecret("");
      setMediaFiles([]);
      setPolicyFile(null);
      router.replace("/claim");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this temporary workspace.");
    }
  }

  if (!job && restoring && routeView) {
    return <section className="claim-shell shell"><p className="restore-status"><LoaderCircle className="spin" size={15} /> Restoring your temporary workspace…</p></section>;
  }

  if (!job) {
    return (
      <section className="claim-shell shell">
        <div className="claim-intro">
          <span className="eyebrow"><span className="eyebrow-dot" /> {text.claimKicker}</span>
          <h1>{text.claimTitle}<br /><em>{text.claimAccent}</em></h1>
          <p>{text.claimCopy}</p>
        </div>
        <section className="claim-intake" aria-labelledby="loss-type-heading">
          <div className="intake-stepper" aria-label="Claim workflow">
            <span className="active"><b>1</b> {text.workflow[0]}</span><i /><span><b>2</b> {text.workflow[1]}</span><i /><span><b>3</b> {text.workflow[2]}</span>
          </div>
          <div className="loss-question">
            <div><span className="card-kicker">{text.quickContext}</span><h2 id="loss-type-heading">{text.claimQuestion}</h2><p>{text.claimQuestionHelp}</p></div>
            <div className="loss-chips">
              {lossTypes.map((type) => {
                const Icon = type.icon;
                return <button type="button" key={type.id} className={lossType === type.id ? "selected" : ""} onClick={() => setLossType(type.id)}><Icon size={17} />{type.label}</button>;
              })}
            </div>
          </div>
        </section>
        <div className="start-grid">
          <article className="sample-card">
            <div className="sample-visual"><div className="sample-frame frame-one" /><div className="sample-frame frame-two" /><span>Sample walkthrough</span></div>
            <span className="card-kicker">{text.sampleKicker}</span>
            <h2>{text.sampleTitle}</h2>
            <p>{text.sampleCopy}</p>
            <button className="button button-primary full-button" onClick={() => void startDemo()} disabled={working}>
              {working ? <LoaderCircle className="spin" size={17} /> : <Sparkles size={17} />} {text.sampleCta}
            </button>
          </article>
          <article className="upload-card">
            <div className="upload-heading"><div className="icon-tile"><Upload size={20} /></div><div><span className="card-kicker">{text.uploadKicker}</span><h2>{text.uploadTitle}</h2></div></div>
            <p>{text.uploadCopy}</p>
            <div className="file-picker">
              <input ref={mediaRef} type="file" accept="image/jpeg,image/png,video/mp4,video/webm" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => setMediaFiles(Array.from(event.target.files ?? []))} />
              <button onClick={() => mediaRef.current?.click()}><ImageIcon size={17} /> {mediaFiles.length ? mediaFiles.length + " media file(s) selected" : text.selectMedia}</button>
              <small>JPG, PNG, MP4, or WebM</small>
            </div>
            <div className="file-picker">
              <input ref={policyRef} type="file" accept="application/pdf" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => setPolicyFile(event.target.files?.[0] ?? null)} />
              <button onClick={() => policyRef.current?.click()}><FileText size={17} /> {policyFile ? policyFile.name : text.selectPolicy}</button>
              <small>Text-based PDF, up to 4 MB</small>
            </div>
            <button className="button button-dark full-button" onClick={startUpload} disabled={working}>
              {working ? <LoaderCircle className="spin" size={17} /> : <Video size={17} />} {policyFile ? text.analyze : "Open demo with selected media"}
            </button>
            {!policyFile && <small className="demo-upload-note">No policy PDF is required for demo mode. Your selected media stays on this device; the opened workspace uses synthetic sample data.</small>}
          </article>
          <MemoryIntakeAgent lossType={lossType as "fire" | "water" | "storm" | "other"} onLossType={setLossType} onCreate={startMemoryIntake} working={working} />
        </div>
        {error && <div className="error-banner"><AlertTriangle size={18} /> {error}</div>}
        <div className="trust-row"><LockKeyhole size={16} /> <span>{text.temporary}</span><span className="trust-divider" /> <button onClick={() => window.dispatchEvent(new Event("claimsight:open-guide"))}>{text.navGuide}</button></div>
        {restoring && <p className="restore-status"><LoaderCircle className="spin" size={15} /> Restoring your temporary workspace…</p>}
      </section>
    );
  }

  return (
    <section className={`workspace shell workspace-${activeView}`} id="claim-help">
      <header className="workspace-header">
        <div><span className="eyebrow"><span className="eyebrow-dot" /> {job.mode === "demo" ? "Synthetic sample" : job.mode === "questionnaire" ? "Memory-built review draft" : "Temporary claim workspace"}</span><h1>{job.title}</h1><p>{job.sourceFrameCount ? `${job.sourceFrameCount} evidence frame${job.sourceFrameCount === 1 ? "" : "s"} · ` : ""}expires in 24 hours</p></div>
        <div className="header-actions">
          <button className="icon-button" aria-label="Refresh claim" onClick={refresh}><RefreshCw size={17} /></button>
          <button className="button button-ghost button-small" onClick={removeJob}><Trash2 size={16} /> Delete now</button>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Claim workspace pages">
        {workspaceViews.map((view) => {
          const Icon = view.icon;
          return <Link key={view.id} href={`/claim/${view.id}`} className={activeView === view.id ? "active" : ""} aria-current={activeView === view.id ? "page" : undefined}><Icon size={15} /><span>{view.label}</span></Link>;
        })}
      </nav>

      <ol className="stage-bar workspace-overview">
        {stages.map((stage, index) => {
          const state = job.stages[stage.key];
          return <li key={stage.key} className={state.status}><span>{state.status === "complete" ? <Check size={13} /> : index + 1}</span><div><strong>{stage.label}</strong><small>{state.message || (state.status === "waiting" ? "Waiting" : state.status)}</small></div></li>;
        })}
      </ol>

      {error && <div className="error-banner"><AlertTriangle size={18} /> {error}</div>}
      {notice && <div className="notice-banner"><BadgeCheck size={18} /> {notice}</div>}

      <section className="claim-brief workspace-overview" aria-label="Claim brief">
        <div className="claim-brief-intro">
          <span className="eyebrow">Claim brief</span>
          <h2>A clear record before you speak with the insurer.</h2>
          <p>These are evidence-led ranges and cited policy terms—not a payment promise.</p>
        </div>
        <div className="brief-metric">
          <ReceiptText size={17} />
          <span>Replacement range</span>
          <strong>{formatCurrency(claimBrief.upperReplacement)}</strong>
          <small>upper estimate</small>
        </div>
        <div className="brief-metric">
          <Eye size={17} />
          <span>What was found</span>
          <strong>{job.inventory.length} items</strong>
          <small>across {claimBrief.roomCount} rooms</small>
        </div>
        <div className="brief-metric brief-attention">
          <AlertTriangle size={17} />
          <span>Review queue</span>
          <strong>{claimBrief.reviewItems}</strong>
          <small>items need extra proof</small>
        </div>
      </section>

      {(["tracker", "documents", "support", "profile"] as WorkspaceView[]).includes(activeView) && <ClaimCenter view={activeView as "tracker" | "documents" | "support" | "profile"} job={job} secret={secret} onJob={setJob} onError={setError} />}

      <div className="dashboard-grid">
        <section className="panel inventory-panel" id="inventory-review">
          <div className="panel-heading inventory-heading"><div><span>Evidence-led inventory</span><h2>{job.inventory.length} items to review</h2></div><div className="pill"><ShieldCheck size={14} /> Edit before export</div></div>
          <div className="inventory-toolbar" aria-label="Inventory filters">
            <span>Show</span>
            <button className={reviewFilter === "all" ? "active" : ""} onClick={() => setReviewFilter("all")}>All {job.inventory.length}</button>
            <button className={reviewFilter === "needs-review" ? "active attention" : ""} onClick={() => setReviewFilter("needs-review")}>Review queue {claimBrief.reviewItems}</button>
            <button className={reviewFilter === "high-value" ? "active" : ""} onClick={() => setReviewFilter("high-value")}>High value {claimBrief.highValueItems}</button>
          </div>
          {Object.entries(rooms).map(([room, items]) => (
            <div className="room-group" key={room}>
              <div className="room-heading"><h3>{room}</h3><span>{items.length} item{items.length === 1 ? "" : "s"}</span></div>
              <div className="item-list">
                {items.map((item) => (
                  <div className="item-row" key={item.id}>
                    <div className="evidence-thumb"><span>{item.evidenceFrameIds[0]?.replace("-", " ")}</span></div>
                    <div className="item-main">
                      {editing === item.id ? (
                        <div className="edit-grid">
                          <input defaultValue={item.name} id={"name-" + item.id} aria-label="Item name" />
                          <input defaultValue={item.quantity} type="number" min="1" id={"quantity-" + item.id} aria-label="Quantity" />
                          <input defaultValue={item.brand} id={"brand-" + item.id} aria-label="Brand" />
                          <input defaultValue={item.model} id={"model-" + item.id} aria-label="Model" />
                          <input defaultValue={item.room} id={"room-" + item.id} aria-label="Room" />
                          <input defaultValue={item.category} id={"category-" + item.id} aria-label="Category" />
                          <select defaultValue={item.condition} id={"condition-" + item.id} aria-label="Condition"><option value="unknown">Unknown</option><option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option><option value="poor">Poor</option></select>
                          <input defaultValue={item.notes} id={"notes-" + item.id} aria-label="Reviewer note" placeholder="Reviewer note" />
                          <button className="save-edit" onClick={() => {
                            const name = (document.getElementById("name-" + item.id) as HTMLInputElement).value;
                            const quantity = Number((document.getElementById("quantity-" + item.id) as HTMLInputElement).value);
                            const brand = (document.getElementById("brand-" + item.id) as HTMLInputElement).value;
                            const model = (document.getElementById("model-" + item.id) as HTMLInputElement).value;
                            const room = (document.getElementById("room-" + item.id) as HTMLInputElement).value;
                            const category = (document.getElementById("category-" + item.id) as HTMLInputElement).value;
                            const condition = (document.getElementById("condition-" + item.id) as HTMLSelectElement).value as InventoryItem["condition"];
                            const notes = (document.getElementById("notes-" + item.id) as HTMLInputElement).value;
                            saveItem(item, { name, quantity, brand, model, room, category, condition, notes });
                          }}>Save</button>
                        </div>
                      ) : <><h4>{item.quantity} × {item.name}</h4><p>{item.brand} · {item.model} · <span className={"confidence " + item.confidence}>{item.confidence} confidence</span>{item.verification === "receipt_verified" && <span className="receipt-verified">Receipt linked</span>}</p></>}
                      {item.notes && <small>{item.notes}</small>}
                    </div>
                    <div className="item-price"><strong>{formatCurrency(item.price?.replacementLow)}–{formatCurrency(item.price?.replacementHigh)}</strong><span>replacement</span>{item.price?.highValue && <small>Receipt/appraisal</small>}</div>
                    <div className="item-actions"><button className="item-detail-trigger" onClick={() => setSelectedItem(item)}>Evidence & price</button><button className="row-edit" aria-label={"Edit " + item.name} onClick={() => setEditing(editing === item.id ? null : item.id)}><Pencil size={15} /></button></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!filteredInventory.length && <div className="empty-state"><ImageIcon size={22} /><p>No items match this review view. Switch back to all items to see the full inventory.</p><button className="button button-ghost button-small" onClick={() => setReviewFilter("all")}>Show all items</button></div>}
        </section>

        <aside className="side-stack">
          <section className="panel summary-card">
            <span>Claim snapshot</span>
            <div className="summary-total">{formatCurrency(claimBrief.upperReplacement)}</div>
            <p>Upper replacement-range estimate across reviewed contents.</p>
            <div className="summary-stats"><div><strong>{job.policy?.coverageBasis ?? "Unknown"}</strong><span>settlement</span></div><div><strong>{formatCurrency(job.policy?.deductible)}</strong><span>deductible</span></div></div>
          </section>

          <section className="panel action-card">
            <div className="panel-heading"><div><span>Before you export</span><h2>Your review plan</h2></div><BadgeCheck size={20} /></div>
            <ol className="action-list">
              <li className={claimBrief.lowConfidenceItems ? "needs-review" : "complete"}>
                <span>1</span><div><strong>{claimBrief.lowConfidenceItems ? `Confirm ${claimBrief.lowConfidenceItems} uncertain item${claimBrief.lowConfidenceItems === 1 ? "" : "s"}` : "Item identity reviewed"}</strong><small>Keep a brand or model as unknown unless the evidence shows it.</small>{claimBrief.lowConfidenceItems > 0 && <button onClick={() => focusReview("needs-review")}>Open review queue</button>}</div>
              </li>
              <li className={claimBrief.highValueItems ? "needs-review" : "complete"}>
                <span>2</span><div><strong>{claimBrief.highValueItems ? `Gather proof for ${claimBrief.highValueItems} high-value item${claimBrief.highValueItems === 1 ? "" : "s"}` : "High-value documentation checked"}</strong><small>Receipts or appraisals make these estimates more defensible.</small>{claimBrief.highValueItems > 0 && <button onClick={() => focusReview("high-value")}>See high-value items</button>}</div>
              </li>
              <li className={job.gaps.length ? "needs-review" : "complete"}>
                <span>3</span><div><strong>{job.gaps.length ? `Understand ${job.gaps.length} confirmed policy gap${job.gaps.length === 1 ? "" : "s"}` : "No confirmed category gap found"}</strong><small>The deductible is shown separately and is not spread across items.</small></div>
              </li>
            </ol>
          </section>

          <section className="panel proof-card">
            <div className="panel-heading"><div><span>Proof trail</span><h2>Why this is defensible</h2></div><ScanSearch size={20} /></div>
            <div className="proof-list">
              <div><Eye size={16} /><p><strong>{job.sourceFrameCount} evidence frames</strong><span>Each inventory row keeps its source-frame reference.</span></p></div>
              <div><FileCheck2 size={16} /><p><strong>{claimBrief.citedTerms} cited policy terms</strong><span>Limits and exclusions are displayed with a quote and page.</span></p></div>
              <div><ReceiptText size={16} /><p><strong>{claimBrief.pricedItems} catalog-priced items</strong><span>Every estimate exposes its replacement and depreciation basis.</span></p></div>
            </div>
          </section>

          <section className={"panel gap-card " + (job.gaps.length ? "has-gap" : "")}>
            <div className="panel-heading"><div><span>Coverage gap report</span><h2>{job.gaps.length ? "Needs attention" : "No confirmed gap"}</h2></div>{job.gaps.length ? <AlertTriangle size={21} /> : <Check size={21} />}</div>
            {job.gaps.map((gap) => <div className="gap-row" key={gap.id}><strong>{gap.category}</strong><p>{formatCurrency(gap.claimedReplacementLow)}–{formatCurrency(gap.claimedReplacementHigh)} estimated total against a {formatCurrency(gap.sublimit)} confirmed sub-limit.</p><span>Estimated gap: {formatCurrency(gap.estimatedGapLow)}–{formatCurrency(gap.estimatedGapHigh)}</span></div>)}
            {!job.gaps.length && <p>ClaimSight has not found a confirmed category sub-limit below the reviewed replacement range.</p>}
          </section>

          <section className="panel policy-card">
            <div className="panel-heading"><div><span>Policy evidence</span><h2>{job.policy?.sourceName ?? "Awaiting policy"}</h2></div><FileText size={20} /></div>
            {job.policy ? <div className="finding-list">{job.policy.findings.map((finding) => <article key={finding.id}><div><strong>{finding.label}</strong><span>p. {finding.page}</span></div><p>“{finding.quote}”</p></article>)}</div> : <p>Upload a policy PDF to extract cited limits and exclusions. Missing or ambiguous terms remain unknown.</p>}
          </section>
        </aside>
      </div>

      <section className="export-bar">
        <div><span className="eyebrow">Ready when you are</span><h2>Review each item, then export a clear starting point for your claim.</h2><p>Estimates are ranges, not a promise of insurer payment. For denials or disputes, speak with a licensed public adjuster or attorney.</p></div>
        <div className="export-actions"><button className="button button-ghost" onClick={() => download("csv")}><Download size={17} /> CSV inventory</button><button className="button button-primary" onClick={() => download("pdf")}><Download size={17} /> Claim PDF</button></div>
      </section>
      {selectedItem && <div className="item-dialog-backdrop" role="presentation" onMouseDown={() => setSelectedItem(null)}>
        <section className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="item-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span className="eyebrow">Item proof card</span><h2 id="item-dialog-title">{selectedItem.quantity} × {selectedItem.name}</h2></div><button onClick={() => setSelectedItem(null)} aria-label="Close item details"><X size={18} /></button></header>
          <div className="item-facts"><span>{selectedItem.room}</span><span>{selectedItem.category}</span><span>{selectedItem.condition} condition</span><span className={"confidence " + selectedItem.confidence}>{selectedItem.confidence} confidence</span></div>
          <div className="item-detail-grid">
            <article><span>Evidence references</span><h3>{selectedItem.evidenceFrameIds.length ? selectedItem.evidenceFrameIds.join(" · ") : "No source frame retained"}</h3><p>{selectedItem.notes || "No additional reviewer note. Confirm visible details against the original photos or video before filing."}</p></article>
            <article><span>Replacement range</span><h3>{formatCurrency(selectedItem.price?.replacementLow)}–{formatCurrency(selectedItem.price?.replacementHigh)}</h3><p>{selectedItem.price?.basis || "Awaiting catalog price estimate."}</p></article>
            <article><span>ACV range</span><h3>{formatCurrency(selectedItem.price?.acvLow)}–{formatCurrency(selectedItem.price?.acvHigh)}</h3><p>{selectedItem.price?.depreciationAssumption || "Age and condition assumption unavailable."}</p></article>
          </div>
          {selectedItem.price?.highValue && <div className="item-high-value"><AlertTriangle size={17} /><span>High-value item — receipt or appraisal recommended.</span></div>}
          <footer><button className="button button-ghost" onClick={() => setSelectedItem(null)}>Back to inventory</button><button className="button button-primary" onClick={() => { setEditing(selectedItem.id); setSelectedItem(null); document.getElementById("inventory-review")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Correct this item <Pencil size={15} /></button></footer>
        </section>
      </div>}
    </section>
  );
}
