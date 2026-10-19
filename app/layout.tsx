import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: { default: "OAuth Launchpad", template: "%s · OAuth Launchpad" },
  description:
    "Know what it takes to ship a provider OAuth app for your agent: effort, waits, review triggers, blockers — with evidence.",
};

const repo = process.env.NEXT_PUBLIC_REPO_URL;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <div className="wrap flex h-12 items-center">
            <Link href="/" className="font-semibold !no-underline" style={{ color: "inherit" }}>OAuth Launchpad</Link>
          </div>
        </header>
        <main className="wrap flex-1 py-8">{children}</main>
        <footer className="border-t border-border">
          <nav className="wrap flex flex-wrap gap-x-5 gap-y-2 py-6 text-sm">
            <Link href="/notes">Setup notes</Link>
            <Link href="/audit">Fact-check audit</Link>
            <Link href="/agent-log">Agent work log</Link>
            {repo && <a href={repo}>GitHub repo</a>}
          </nav>
        </footer>
      </body>
    </html>
  );
}
