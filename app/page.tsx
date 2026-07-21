"use client";

import Link from "next/link";
import { ArrowRight, Camera, CheckCircle2, Eye, FileCheck2, FileSearch, ReceiptText, ShieldCheck, Sparkles, Video } from "lucide-react";
import { SiteChrome } from "@/components/site-chrome";
import { useLanguage } from "@/components/language-provider";

const stepIcons = [Video, Sparkles, FileSearch, ShieldCheck];

const proofPoints = [
  { icon: Eye, title: "Uncertainty stays visible", text: "If a brand, model, quantity, or condition isn't supported by the evidence, it's marked unknown and flagged for your review — never invented." },
  { icon: FileCheck2, title: "Every policy term has a source", text: "Each limit, exclusion, and deductible is paired with your policy's exact wording and page reference." },
  { icon: ReceiptText, title: "Every price has a basis", text: "Replacement and ACV ranges come from a transparent catalog with explicit age and condition assumptions — ranges, not false precision." }
];

export default function HomePage() {
  const { text } = useLanguage();
  const steps = text.steps.map((step, index) => ({ ...step, icon: stepIcons[index] }));
  return (
    <main className="home-page">
      <SiteChrome />

      <section className="hero shell" id="home-top">
        <div className="hero-copy-wrap">
          <div className="eyebrow"><span className="eyebrow-dot" /> {text.heroKicker}</div>
          <h1>{text.heroTitle}<br /><em>{text.heroAccent}</em></h1>
          <p className="hero-copy">{text.heroCopy}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/claim">{text.heroStart} <ArrowRight size={17} /></Link>
            <a className="button button-ghost" href="#how-it-works">{text.heroHow}</a>
          </div>
          <p className="privacy-line"><ShieldCheck size={14} /> {text.heroPrivacy}</p>
        </div>
        <div className="hero-evidence-card" aria-label="Illustration of organized claim evidence">
          <div className="evidence-orbit orbit-one" /><div className="evidence-orbit orbit-two" />
          <div className="evidence-photo photo-a"><Camera size={22} /><span>Living room</span></div>
          <div className="evidence-photo photo-b"><Video size={22} /><span>Walkthrough</span></div>
          <div className="evidence-status"><CheckCircle2 size={17} /><span>Evidence organized</span><strong>16 items</strong></div>
        </div>
      </section>

      <section id="how-it-works" className="steps shell">
        <div className="section-heading">
          <span>{text.howKicker}</span>
          <h2>{text.howTitle.split("\n").map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</h2>
        </div>
        <div className="step-grid">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article className="step-card" key={step.title}>
                <div className="step-top"><span>0{index + 1}</span><Icon size={20} strokeWidth={1.7} /></div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="proof-section shell" id="defensible">
        <div className="proof-section-copy">
          <span className="eyebrow">No black boxes</span>
          <h2>Every number can be shown,<br /><em>explained, and corrected.</em></h2>
          <p>A good claim isn&apos;t the loudest estimate. It&apos;s the one you can defend before you file.</p>
        </div>
        <div className="proof-point-grid">
          {proofPoints.map((point, index) => {
            const Icon = point.icon;
            return <article className="proof-point" key={point.title}>
              <div><span>0{index + 1}</span><Icon size={18} /></div>
              <h3>{point.title}</h3>
              <p>{point.text}</p>
            </article>;
          })}
        </div>
      </section>

      <section className="callout shell" id="claim-help">
        <div><span className="eyebrow">A more defensible starting point</span><h2>Built to support your claim,<br />not minimize it.</h2></div>
        <p>Public adjusters charge 10–15% of your payout to do this work. ClaimSight is your documentation tool — you stay in control of every item, every estimate, and every export. It&apos;s not a lawyer or licensed adjuster, and it never files on your behalf.</p>
      </section>
    </main>
  );
}
