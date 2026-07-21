"use client";

import { Languages } from "lucide-react";
import { languageOptions, type AppLanguage } from "@/lib/language";
import { useLanguage } from "@/components/language-provider";

export function LanguageSwitcher() {
  const { language, setLanguage, text } = useLanguage();
  return (
    <label className="language-switcher">
      <span className="language-switcher-icon"><Languages size={15} aria-hidden="true" /></span>
      <span className="sr-only">{text.language}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as AppLanguage)} aria-label={text.language}>
        {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
      </select>
    </label>
  );
}
