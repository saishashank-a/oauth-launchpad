import { Suspense } from "react";
import { connection } from "next/server";
import GenerateForm from "@/components/GenerateForm";
import GuideLibrary, { type GuideCard } from "@/components/GuideLibrary";
import { DIFFICULTY, REGISTRATION, timingText } from "@/components/ui";
import { listAllGuides } from "@/lib/guides";
import { coverage, type Guide } from "@/lib/schema";

function coverageText(g: Guide) {
  const c = coverage(g);
  return [
    `${c.supported} supported`,
    `${c.partial} partial`,
    `${c.unverified} unverified`,
    c.conflicting ? `${c.conflicting} conflicting` : null,
    `${c.firsthand} firsthand`,
  ].filter(Boolean).join(" · ");
}

async function Library() {
  await connection(); // request-time: generated guides appear without a redeploy
  const guides = await listAllGuides();
  const cards: GuideCard[] = guides.map((g) => ({
    slug: g.slug,
    provider: g.provider.name,
    title: g.title,
    origin: g.origin,
    difficulty: DIFFICULTY[g.difficulty.level],
    effort: timingText(g.handsOnEffort, "Unknown"),
    wait: timingText(g.providerWait, "Not published"),
    coverage: coverageText(g),
    lastResearched: g.lastResearched,
    registration: REGISTRATION[g.registration.availability],
    haystack: [g.provider.name, g.title, g.useCase, ...g.scopes.map((s) => s.name)].join(" ").toLowerCase(),
  }));
  return <GuideLibrary cards={cards} />;
}

export default function Home() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">OAuth Launchpad</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Know what it takes to ship a provider OAuth app for your agent: effort, waits, review triggers, blockers — with evidence.
        </p>
      </section>
      <section className="box mt-6">
        <h2 className="mb-2 font-semibold">Research a provider: app name or website</h2>
        <GenerateForm />
      </section>
      <section className="mt-10">
        <Suspense fallback={<p className="text-sm text-muted">Loading guides…</p>}>
          <Library />
        </Suspense>
      </section>
    </>
  );
}
