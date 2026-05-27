import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DemoBanner } from "@/components/DemoBanner";
import { SiteNav } from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "AgentPay Guard — Mandate Enforcement for AI Agents",
  description: "Public demo sandbox for AI-agent payment mandates, policy decisions, and tamper-evident audit."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="kya-shell min-h-full flex flex-col text-slate-900">
        <DemoBanner />
        <SiteNav />
        <main className="relative mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">{children}</main>
      </body>
    </html>
  );
}
