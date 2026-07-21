"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, ClipboardPenLine, LoaderCircle, Pencil, RotateCcw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { inventoryFromQuestionnaire } from "@/lib/claim-tools";
import { useLanguage } from "@/components/language-provider";

type LossType = "fire" | "water" | "storm" | "other";
type ChatMessage = { role: "assistant" | "user"; content: string };
type ItemGroup = { room: string; items: string };
type IntakeState = { lossType?: LossType; rooms: string[]; itemGroups: ItemGroup[]; state: string; insurer: string; lossDate: string };
type AssistantResponse = {
  reply: string;
  suggestedReplies?: string[];
  readyToReview?: boolean;
  source?: "live" | "offline";
  intakePatch?: Partial<IntakeState>;
  error?: string;
};

type Props = {
  lossType: LossType;
  onLossType: (type: LossType) => void;
  onCreate: (details: { answers: string; state: string; insurer: string; lossDate: string }) => Promise<void>;
  working: boolean;
};

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mergeIntake(previous: IntakeState, patch?: Partial<IntakeState>): IntakeState {
  if (!patch) return previous;
  const itemGroups = [...previous.itemGroups];
  for (const group of patch.itemGroups ?? []) {
    const room = cleanText(group.room);
    const items = cleanText(group.items);
    if (!room || !items) continue;
    const index = itemGroups.findIndex((current) => current.room.toLowerCase() === room.toLowerCase());
    if (index >= 0) itemGroups[index] = { room: itemGroups[index].room, items };
    else itemGroups.push({ room, items });
  }
  const rooms = [...previous.rooms];
  for (const room of [...(patch.rooms ?? []), ...itemGroups.map((group) => group.room)]) {
    const cleanRoom = cleanText(room);
    if (cleanRoom && !rooms.some((current) => current.toLowerCase() === cleanRoom.toLowerCase())) rooms.push(cleanRoom);
  }
  return {
    lossType: patch.lossType ?? previous.lossType,
    rooms: rooms.slice(0, 12),
    itemGroups: itemGroups.slice(0, 12),
    state: patch.state ?? previous.state,
    insurer: patch.insurer ?? previous.insurer,
    lossDate: patch.lossDate ?? previous.lossDate
  };
}

export function MemoryIntakeAgent({ lossType, onLossType, onCreate, working }: Props) {
  const { language, text } = useLanguage();
  const startingPrompts = text.lossTypes;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: text.intakeGreeting }
  ]);
  const [intake, setIntake] = useState<IntakeState>({ lossType, rooms: [], itemGroups: [], state: "", insurer: "", lossDate: "" });
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>(startingPrompts);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"live" | "offline" | null>(null);
  const [editingDraft, setEditingDraft] = useState(false);
  const [draftText, setDraftText] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const structuredAnswer = useMemo(() => intake.itemGroups.map((group) => `${group.room}: ${group.items}`).join("\n"), [intake.itemGroups]);
  const previewItems = useMemo(() => inventoryFromQuestionnaire(draftText || structuredAnswer), [draftText, structuredAnswer]);
  const readyToReview = previewItems.length > 0;

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setIntake((current) => current.lossType === lossType ? current : { ...current, lossType });
  }, [lossType]);

  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0]?.role === "assistant" ? [{ role: "assistant", content: text.intakeGreeting }] : current);
    setSuggestions(text.lossTypes);
  }, [language]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "intake", language, messages: nextMessages, intake })
      });
      const payload = await response.json() as AssistantResponse;
      if (!response.ok || !payload.reply) throw new Error(payload.error ?? "The intake assistant could not respond.");
      if (payload.intakePatch) {
        if (payload.intakePatch.lossType && payload.intakePatch.lossType !== lossType) onLossType(payload.intakePatch.lossType);
        setIntake((current) => mergeIntake(current, payload.intakePatch));
      }
      setMessages((current) => [...current, { role: "assistant", content: payload.reply }]);
      if (payload.suggestedReplies?.length) setSuggestions(payload.suggestedReplies.slice(0, 3));
      setSource(payload.source ?? "live");
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: text.intakeOffline }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(value);
  }

  function reset() {
    setMessages([{ role: "assistant", content: text.intakeGreeting }]);
    setIntake({ lossType, rooms: [], itemGroups: [], state: "", insurer: "", lossDate: "" });
    setSuggestions(startingPrompts);
    setDraftText("");
    setEditingDraft(false);
    setSource(null);
  }

  async function createWorkspace() {
    await onCreate({ answers: draftText || structuredAnswer, state: intake.state, insurer: intake.insurer, lossDate: intake.lossDate });
  }

  return (
    <article className="intake-chat-card" aria-labelledby="memory-agent-heading">
      <header className="intake-chat-header">
        <span className="intake-avatar"><Bot size={21} /></span>
        <div><span>ClaimSight intake assistant</span><h2 id="memory-agent-heading">{text.intakeTitle}</h2></div>
        <button className="reset-intake" onClick={reset} type="button"><RotateCcw size={14} /> {text.startOver}</button>
      </header>
      <p className="intake-chat-note">{text.intakeIntro}</p>

      <div className="intake-chat-thread" aria-live="polite" ref={threadRef}>
        {messages.map((message, index) => <div className={"intake-message " + message.role} key={index}>
          {message.role === "assistant" && <span><Bot size={15} /></span>}
          <p>{message.content}</p>
        </div>)}
        {loading && <div className="intake-message assistant"><span><Bot size={15} /></span><p className="typing"><LoaderCircle size={14} className="spin" /> Thinking…</p></div>}
      </div>

      <div className="intake-suggestions" aria-label="Suggested answers">
        {suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => void sendMessage(suggestion)} disabled={loading}>{suggestion}</button>)}
      </div>
      <form className="intake-composer" onSubmit={submit}>
        <textarea value={value} onChange={(event) => setValue(event.target.value)} placeholder={text.intakePlaceholder} aria-label={text.intakePlaceholder} disabled={loading} rows={2} />
        <button type="submit" aria-label="Send message" disabled={loading || !value.trim()}>{loading ? <LoaderCircle size={17} className="spin" /> : <Send size={17} />}</button>
      </form>

      <section className="intake-capture" aria-label="Details captured from your conversation">
        <header><div><span>Draft capture</span><strong>{previewItems.length ? `${previewItems.length} item${previewItems.length === 1 ? "" : "s"} ready to review` : "Items will appear here as you chat"}</strong></div><small>{source === "offline" ? text.intakeOffline : "Only confirmed details are captured"}</small></header>
        {previewItems.length > 0 && <div className="intake-capture-list">{previewItems.slice(0, 8).map((item) => <p key={item.id}><span>{item.room}</span><strong>{item.quantity} × {item.name}</strong><small>Brand, model & condition unknown</small></p>)}{previewItems.length > 8 && <small className="capture-more">+ {previewItems.length - 8} more items</small>}</div>}
        {readyToReview && <>
          <button type="button" className="capture-edit" onClick={() => { setDraftText(draftText || structuredAnswer); setEditingDraft((current) => !current); }}><Pencil size={14} /> {editingDraft ? "Hide editable list" : "Modify captured items"}</button>
          {editingDraft && <textarea className="capture-editor" value={draftText} onChange={(event) => setDraftText(event.target.value)} aria-label="Editable inventory draft" />}
          <button className="button button-dark full-button intake-create" type="button" onClick={() => void createWorkspace()} disabled={working}><ClipboardPenLine size={17} /> {working ? "Building editable draft…" : "Create editable claim draft"}</button>
          <p className="intake-footer"><ShieldCheck size={14} /> Nothing is filed or sent. Review every item before export.</p>
        </>}
      </section>
      {readyToReview && <p className="intake-ready"><CheckCircle2 size={15} /> Your first draft is ready whenever you are.</p>}
    </article>
  );
}
