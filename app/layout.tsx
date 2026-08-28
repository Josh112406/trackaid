import type { Metadata } from "next";
import { Epilogue, Fraunces } from "next/font/google";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import "./globals.css";

const epilogue = Epilogue({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TrackAid | Public disaster-relief audit trail",
  description:
    "Transparent disaster-relief donations, disbursements, evidence, and confirmations.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${epilogue.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="TrackAid home">
            <span className="brand-mark" aria-hidden="true">
              <ShieldCheck size={20} strokeWidth={2.2} />
            </span>
            TrackAid
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/campaigns">Campaigns</Link>
            <Link href="/official-sources">Official sources</Link>
            <Link href="/public-audit">Public audit</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/organizations">Organizations</Link>
            <Link href="/admin">Admin</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <div>
            <strong>TrackAid</strong>
            <p>Relief funding with a public, tamper-evident audit trail.</p>
          </div>
          <div className="footer-links">
            <Link href="/campaigns">Campaigns</Link>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/public-audit">Public audit</Link>
            <Link href="/blockchain">Blockchain</Link>
            <Link href="/verify">Organization verification</Link>
            <Link href="/admin">Admin dashboard</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
