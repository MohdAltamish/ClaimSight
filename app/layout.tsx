import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = {
  title: "ClaimSight — Build a defensible contents claim",
  description: "Turn home evidence into a policy-aware contents inventory."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><LanguageProvider>{children}<footer className="site-footer"><Link href="/privacy">Privacy Policy</Link></footer></LanguageProvider></body>
    </html>
  );
}
