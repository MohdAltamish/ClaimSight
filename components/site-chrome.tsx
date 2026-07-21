"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Sparkles } from "lucide-react";
import { ClaimAssistant } from "@/components/claim-assistant";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useLanguage } from "@/components/language-provider";

type ActiveDestination = "home" | "claim" | "guide";

export function SiteChrome() {
  const pathname = usePathname();
  const { text } = useLanguage();
  const [active, setActive] = useState<ActiveDestination>(pathname === "/claim" ? "claim" : "home");

  useEffect(() => {
    if (pathname === "/claim") {
      setActive("claim");
      return;
    }
    const syncFromHash = () => setActive(window.location.hash === "#how-it-works" ? "guide" : "home");
    syncFromHash();
    const howItWorks = document.getElementById("how-it-works");
    const home = document.getElementById("home-top");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id === "how-it-works") setActive("guide");
      if (visible?.target.id === "home-top") setActive("home");
    }, { threshold: 0.35 });
    if (howItWorks) observer.observe(howItWorks);
    if (home) observer.observe(home);
    window.addEventListener("hashchange", syncFromHash);
    return () => { observer.disconnect(); window.removeEventListener("hashchange", syncFromHash); };
  }, [pathname]);

  const current = (destination: ActiveDestination) => active === destination ? "page" : undefined;
  const className = (destination: ActiveDestination) => active === destination ? "active" : "";

  return (
    <>
      <header className="site-header">
        <div className="site-nav shell">
          <Link className="wordmark" href="/" aria-label="ClaimSight home" onClick={() => setActive("home")}><span className="wordmark-mark">C</span>Claim<span>Sight</span></Link>
          <nav className="nav-segments" aria-label="Primary navigation">
            <Link className={className("home")} href="/" aria-current={current("home")} onClick={() => setActive("home")}><Home size={14} /> {text.navHome}</Link>
            <Link className={className("claim")} href="/claim" aria-current={current("claim")} onClick={() => setActive("claim")}><Sparkles size={14} /> {text.navClaim}</Link>
            <a className={className("guide")} href="/#how-it-works" aria-current={current("guide")} onClick={() => setActive("guide")}><BookOpen size={14} /> {text.navGuide}</a>
          </nav>
          <LanguageSwitcher />
        </div>
      </header>
      <ClaimAssistant />
      <nav className="bottom-nav" aria-label="Quick navigation">
        <Link className={className("home")} href="/" aria-current={current("home")} onClick={() => setActive("home")}><Home size={17} /><span>{text.navHome}</span></Link>
        <Link className={className("claim")} href="/claim" aria-current={current("claim")} onClick={() => setActive("claim")}><Sparkles size={17} /><span>{text.navClaim}</span></Link>
        <a className={className("guide")} href="/#how-it-works" aria-current={current("guide")} onClick={() => setActive("guide")}><BookOpen size={17} /><span>{text.navGuide}</span></a>
      </nav>
    </>
  );
}
