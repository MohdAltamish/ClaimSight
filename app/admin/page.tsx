"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, KeyRound, LockKeyhole, RefreshCw, Save, ShieldAlert } from "lucide-react";

type Complaint = { id: string; claimId: string; claimTitle: string; state: string; insurer: string; status: "new" | "under_review" | "ready_for_human_review" | "resolved"; reason: string; draft: string; createdAt: string };
type Metrics = { open: number; awaitingHumanReview: number; total: number };
type GeminiSettings = { provider: "gemini"; model: "gemini-2.5-flash"; configured: boolean; storageReady: boolean; updatedAt: string | null; message?: string };

function adminHeaders(key: string, json = false) {
  return { "x-claimsight-admin-key": key, ...(json ? { "Content-Type": "application/json" } : {}) };
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [queue, setQueue] = useState<Complaint[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [geminiSettings, setGeminiSettings] = useState<GeminiSettings | null>(null);
  const [geminiKey, setGeminiKey] = useState("");

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setNotice("");
    try {
      const [queueResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/complaints", { headers: adminHeaders(key) }),
        fetch("/api/admin/ai-settings", { headers: adminHeaders(key) })
      ]);
      const queueData = await queueResponse.json();
      const settingsData = await settingsResponse.json();
      if (!queueResponse.ok) throw new Error(queueData.error || "Could not load the queue.");
      if (!settingsResponse.ok) throw new Error(settingsData.error || "Could not load Gemini settings.");
      setQueue(queueData.complaints);
      setMetrics(queueData.metrics);
      setGeminiSettings(settingsData as GeminiSettings);
      setNotice(queueData.notice);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load the admin console.");
    } finally {
      setLoading(false);
    }
  }

  async function update(complaint: Complaint, status: Complaint["status"]) {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/complaints/${complaint.claimId}/${complaint.id}`, {
        method: "PATCH",
        headers: adminHeaders(key, true),
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this review.");
      setQueue((current) => current.map((entry) => entry.id === complaint.id ? { ...entry, status } : entry));
      setNotice("Review status saved to the claim audit record. No external message was sent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update this review.");
    } finally {
      setLoading(false);
    }
  }

  async function saveGeminiKey(event: FormEvent) {
    event.preventDefault();
    if (!geminiKey.trim()) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: adminHeaders(key, true),
        body: JSON.stringify({ apiKey: geminiKey })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save the Gemini API key.");
      setGeminiSettings(data as GeminiSettings);
      setGeminiKey("");
      setNotice("Gemini API key verified and saved securely. Live analysis is now available.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the Gemini API key.");
    } finally {
      setLoading(false);
    }
  }

  const orderedQueue = [...queue].sort((left, right) => {
    const priority = { ready_for_human_review: 0, new: 1, under_review: 2, resolved: 3 } as const;
    return priority[left.status] - priority[right.status] || right.createdAt.localeCompare(left.createdAt);
  });

  return (
    <main className="admin-page shell">
      <header>
        <span className="eyebrow"><LockKeyhole size={13} /> Human review console</span>
        <h1>Complaint review queue</h1>
        <p>This protected console is for trained reviewers. It has no regulator-dispatch or email-send capability.</p>
      </header>

      <form onSubmit={load} className="admin-key-form">
        <label>Admin key<input value={key} onChange={(event) => setKey(event.target.value)} type="password" autoComplete="current-password" required /></label>
        <button className="button button-dark" disabled={loading}>{loading ? <RefreshCw className="spin" size={16} /> : <LockKeyhole size={16} />} Load console</button>
      </form>

      {notice && <p className="admin-notice">{notice}</p>}

      {geminiSettings && <section className="admin-settings" aria-labelledby="gemini-settings-heading">
        <div className="admin-settings-heading">
          <div><span><KeyRound size={14} /> Live AI</span><h2 id="gemini-settings-heading">Gemini configuration</h2></div>
          <strong className={geminiSettings.configured ? "configured" : "not-configured"}>{geminiSettings.configured ? "Configured" : "Not configured"}</strong>
        </div>
        <dl>
          <div><dt>Provider</dt><dd>Google Gemini</dd></div>
          <div><dt>Model</dt><dd>{geminiSettings.model}</dd></div>
          <div><dt>Last updated</dt><dd>{geminiSettings.updatedAt ? new Date(geminiSettings.updatedAt).toLocaleString() : "Not yet saved"}</dd></div>
        </dl>
        <p>{geminiSettings.storageReady ? "Replacing the key verifies it with Gemini before saving an encrypted value. The plaintext key is never shown again." : geminiSettings.message}</p>
        <form onSubmit={saveGeminiKey} className="admin-gemini-form">
          <label>Replace Gemini API key<input value={geminiKey} onChange={(event) => setGeminiKey(event.target.value)} type="password" autoComplete="new-password" placeholder="Paste a newly rotated Gemini key" disabled={loading || !geminiSettings.storageReady} /></label>
          <button className="button button-dark" disabled={loading || !geminiSettings.storageReady || !geminiKey.trim()}>{loading ? <RefreshCw className="spin" size={16} /> : <Save size={16} />} Verify &amp; save</button>
        </form>
      </section>}

      {metrics && <section className="admin-metrics" aria-label="Complaint review metrics">
        <article><span>Open drafts</span><strong>{metrics.open}</strong><small>not resolved</small></article>
        <article><span>Needs human review</span><strong>{metrics.awaitingHumanReview}</strong><small>priority first</small></article>
        <article><span>All temporary drafts</span><strong>{metrics.total}</strong><small>across active workspaces</small></article>
      </section>}

      <section className="admin-queue">
        {orderedQueue.map((complaint) => <article key={complaint.id}>
          <div className="admin-case-heading"><div><span>{complaint.state} · {complaint.insurer}</span><h2>{complaint.claimTitle}</h2><p>{complaint.reason}</p></div><select aria-label="Review status" value={complaint.status} disabled={loading} onChange={(event) => void update(complaint, event.target.value as Complaint["status"])}><option value="new">New</option><option value="under_review">Under review</option><option value="ready_for_human_review">Ready for human review</option><option value="resolved">Resolved</option></select></div>
          <details><summary>Read draft <ShieldAlert size={14} /></summary><pre>{complaint.draft}</pre></details>
        </article>)}
        {!queue.length && key && !loading && <div className="admin-empty"><CheckCircle2 size={22} /> No active complaint drafts in the temporary workspaces.</div>}
      </section>
    </main>
  );
}
