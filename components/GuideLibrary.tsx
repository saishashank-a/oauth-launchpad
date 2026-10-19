"use client";
import Link from "next/link";
import { useState } from "react";

export type GuideCard = {
  slug: string;
  provider: string;
  title: string;
  origin: "curated" | "generated";
  difficulty: { label: string; tone: string };
  effort: string;
  wait: string;
  coverage: string;
  lastResearched: string;
  registration: { label: string; tone: string };
  haystack: string;
};

const chip = (tone: string) => `chip${tone === "neutral" ? "" : ` chip-${tone}`}`;

export default function GuideLibrary({ cards }: { cards: GuideCard[] }) {
  const [q, setQ] = useState("");
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = cards.filter((c) => terms.every((t) => c.haystack.includes(t)));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Library</h2>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by provider, use case, scope"
          aria-label="Filter guides"
          className="w-full sm:w-80 rounded-md border border-border bg-background px-3 py-1.5 text-sm"
        />
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{cards.length ? "No guides match that filter." : "No guides yet."}</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {shown.map((c) => (
            <li key={c.slug}>
              <Link href={`/g/${c.slug}`} className="card block h-full !no-underline hover:border-accent" style={{ color: "inherit" }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold">{c.provider}</span>
                  <span className="chip chip-outline">{c.origin}</span>
                  <span className={chip(c.registration.tone)}>{c.registration.label}</span>
                </div>
                <p className="mt-1 text-sm">{c.title}</p>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="label">Difficulty</dt>
                    <dd className="mt-0.5"><span className={chip(c.difficulty.tone)}>{c.difficulty.label}</span> <span className="text-xs text-muted">assessment</span></dd>
                  </div>
                  <div>
                    <dt className="label">Hands-on</dt>
                    <dd className="mt-0.5 line-clamp-3" title={c.effort}>{c.effort}</dd>
                  </div>
                  <div>
                    <dt className="label">Provider wait</dt>
                    <dd className="mt-0.5 line-clamp-3" title={c.wait}>{c.wait}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted">Evidence: {c.coverage}</p>
                <p className="mt-0.5 text-xs text-muted">Last checked {c.lastResearched}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
