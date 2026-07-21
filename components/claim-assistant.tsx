"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, MessageCircle, Send, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

type Message = { from: "guide" | "user"; text: string };
type AssistantResponse = { reply: string; suggestedReplies?: string[]; source?: "live" | "offline" };

export function ClaimAssistant() {
  const { language, text } = useLanguage();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"live" | "offline" | null>(null);
  const [prompts, setPrompts] = useState<string[]>(text.guidePrompts);
  const [messages, setMessages] = useState<Message[]>([
    { from: "guide", text: text.guideIntro }
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const openGuide = () => setOpen(true);
    window.addEventListener("claimsight:open-guide", openGuide);
    return () => window.removeEventListener("claimsight:open-guide", openGuide);
  }, []);

  useEffect(() => {
    setMessages((current) => current.length === 1 && current[0]?.from === "guide" ? [{ from: "guide", text: text.guideIntro }] : current);
    setPrompts(text.guidePrompts);
  }, [language]);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;
    const nextMessages = [...messages, { from: "user" as const, text: trimmed }];
    setMessages(nextMessages);
    setValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "guide",
          language,
          messages: nextMessages.map((message) => ({ role: message.from === "guide" ? "assistant" : "user", content: message.text }))
        })
      });
      const payload = await response.json() as AssistantResponse & { error?: string };
      if (!response.ok || !payload.reply) throw new Error(payload.error ?? "The guide could not respond.");
      setMessages((current) => [...current, { from: "guide", text: payload.reply }]);
      if (payload.suggestedReplies?.length) setPrompts(payload.suggestedReplies.slice(0, 3));
      setSource(payload.source ?? "live");
    } catch {
      setMessages((current) => [...current, { from: "guide", text: source === "live" ? "Sorry, I couldn't respond just now. Please try again." : text.guideOffline }]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(value);
  }

  return (
    <>
      <button className="guide-fab" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="claim-guide">
        {open ? <X size={21} /> : <MessageCircle size={21} />}<span>{open ? "Close" : "Claim guide"}</span>
      </button>
      <aside className={"guide-panel " + (open ? "open" : "")} id="claim-guide" aria-label="ClaimSight guide">
        <header>
          <span className="guide-icon"><Bot size={17} /></span>
          <div><strong>ClaimSight {text.navGuide}</strong><small>{source === "offline" ? text.guideOffline : text.guideLive}</small></div>
          <button onClick={() => setOpen(false)} aria-label="Close claim guide"><X size={17} /></button>
        </header>
        <div className="guide-messages" aria-live="polite" ref={messagesRef}>
          {messages.map((message, index) => <p className={message.from} key={index}>{message.text}</p>)}
          {loading && <p className="guide typing" aria-label="ClaimSight guide is thinking"><LoaderCircle size={14} className="spin" /> Thinking…</p>}
        </div>
        <div className="guide-prompts" aria-label="Suggested questions">
          {prompts.map((prompt) => <button key={prompt} onClick={() => void ask(prompt)} disabled={loading}>{prompt}</button>)}
        </div>
        <form onSubmit={submit}>
          <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={text.guidePlaceholder} aria-label={text.guidePlaceholder} disabled={loading} />
          <button type="submit" aria-label="Send question" disabled={loading || !value.trim()}>{loading ? <LoaderCircle size={16} className="spin" /> : <Send size={16} />}</button>
        </form>
      </aside>
    </>
  );
}
