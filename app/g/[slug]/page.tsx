import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import ShareButton from "@/components/ShareButton";
import {
  ACCESS, APPLIES, CATEGORY, Chip, DIFFICULTY, EvidenceBadges, OWNER, OriginChip, REGISTRATION, STATUS, TimingIndicator,
} from "@/components/ui";
import { findGuide } from "@/lib/guides";
import type { Claim, Guide } from "@/lib/schema";

// With cacheComponents on, `export const dynamic` is not allowed; reading params
// inside <Suspense> makes this request-time, so new generated guides show up live.

export async function generateMetadata({ params }: PageProps<"/g/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = await findGuide(slug);
  if (!g) return { title: "Guide not found" };
  const title = `${g.provider.name}: ${g.title}`;
  const description = g.useCase.length > 200 ? g.useCase.slice(0, 197) + "…" : g.useCase;
  return { title, description, openGraph: { title, description, type: "article" }, twitter: { card: "summary", title, description } };
}

export default function Page({ params }: PageProps<"/g/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading guide…</p>}>
      <GuideView params={params} />
    </Suspense>
  );
}

async function GuideView({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await findGuide(slug);
  if (!g) notFound();
  return <GuideBody g={g} />;
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Bullets({ items, empty = "None recorded." }: { items: string[]; empty?: string }) {
  return items.length ? <ul className="list text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul> : <p className="text-sm text-muted">{empty}</p>;
}

function GuideBody({ g }: { g: Guide }) {
  const claims = g.claims;
  const diff = DIFFICULTY[g.difficulty.level];
  const reg = REGISTRATION[g.registration.availability];
  const humanSteps = g.steps.map((s, i) => ({ s, n: i + 1 })).filter(({ s }) => s.owner === "human");
  const count = (o: string) => g.steps.filter((s) => s.owner === o).length;

  return (
    <article>
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="font-medium text-foreground">{g.provider.name}</span>
          <OriginChip origin={g.origin} />
          <span>Last researched {g.lastResearched}</span>
          <span className="ml-auto"><ShareButton /></span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{g.title}</h1>
        <nav className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <a href={g.provider.website}>Website</a>
          {g.provider.developerPortal && <a href={g.provider.developerPortal}>Developer portal</a>}
          {g.provider.docsHome && <a href={g.provider.docsHome}>Docs</a>}
        </nav>
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="card flex-1 min-w-0">
            <div className="label">Difficulty · assessment</div>
            <div className="mt-1"><Chip tone={diff.tone}>{diff.label}</Chip></div>
            <details className="mt-2 text-sm">
              <summary className="text-muted">Why this assessment</summary>
              <p className="mt-1">{g.difficulty.rationale}</p>
            </details>
          </div>
          <TimingIndicator label="Hands-on effort" timing={g.handsOnEffort} unknownLabel="Unknown" claims={claims} />
          <TimingIndicator label="Provider wait" timing={g.providerWait} unknownLabel="Not published" claims={claims} />
        </div>
      </header>

      {/* Next actions first */}
      <section className="box mt-6" aria-labelledby="next">
        <h2 id="next" className="font-semibold">Start here: next actions</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">
          {g.nextActions.map((a, i) => <li key={i}>{a}</li>)}
        </ol>
      </section>

      <Section id="use-case" title="Use case">
        <p className="text-sm">{g.useCase}</p>
        <p className="mt-2 text-sm"><span className="label">Audience</span> {g.audience}</p>
        {g.assumptions.length > 0 && (
          <div className="mt-3">
            <div className="label mb-1">Assumptions</div>
            <Bullets items={g.assumptions} />
          </div>
        )}
      </Section>

      <Section id="scopes" title="Requested scopes">
        {g.scopes.length ? (
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Scope</th><th>Purpose</th><th>Access</th><th>Evidence</th></tr></thead>
              <tbody>
                {g.scopes.map((s) => (
                  <tr key={s.name}>
                    <td><code className="font-mono text-xs">{s.name}</code></td>
                    <td>{s.purpose}</td>
                    <td><Chip tone={ACCESS[s.access].tone}>{ACCESS[s.access].label}</Chip></td>
                    <td><EvidenceBadges claimIds={s.claimIds} claims={claims} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted">No scopes listed.</p>}
      </Section>

      <Section id="registration" title="Registration availability">
        <div className="card">
          <Chip tone={reg.tone}>{reg.label}</Chip>
          <p className="mt-2 text-sm">{g.registration.summary}</p>
          <div className="mt-2"><EvidenceBadges claimIds={g.registration.claimIds} claims={claims} /></div>
        </div>
      </Section>

      <Section id="testing" title="Testing vs launch">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card">
            <h3 className="font-semibold">What you can test now</h3>
            <div className="mt-2"><Bullets items={g.testing.availableNow} /></div>
            {g.testing.restrictions.length > 0 && (
              <>
                <div className="label mt-3 mb-1">Restrictions while testing</div>
                <Bullets items={g.testing.restrictions} />
              </>
            )}
            <div className="mt-2"><EvidenceBadges claimIds={g.testing.claimIds} claims={claims} /></div>
          </div>
          <div className="card">
            <h3 className="font-semibold">Required before real users connect</h3>
            <div className="mt-2"><Bullets items={g.launch.requirements} /></div>
            <div className="mt-2"><EvidenceBadges claimIds={g.launch.claimIds} claims={claims} /></div>
          </div>
        </div>
      </Section>

      <Section id="review" title="Review stages">
        {g.reviewStages.length ? (
          <ul className="grid gap-3">
            {g.reviewStages.map((r, i) => (
              <li key={i} className="card">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.name}</span>
                  <Chip tone={APPLIES[r.applies].tone}>applies: {APPLIES[r.applies].label}</Chip>
                  <Chip tone="outline">wait: {r.wait.kind === "unknown" || !r.wait.value ? "Not published" : r.wait.value} ({r.wait.kind})</Chip>
                  {r.url && <a href={r.url} className="text-sm">Docs</a>}
                </div>
                <p className="mt-1 text-sm"><span className="label">Trigger</span> {r.trigger}</p>
                {r.wait.basis && <p className="mt-1 text-sm text-muted">Wait basis: {r.wait.basis}</p>}
                <div className="mt-2"><EvidenceBadges claimIds={[...r.claimIds, ...r.wait.claimIds.filter((id) => !r.claimIds.includes(id))]} claims={claims} /></div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">No review stages recorded.</p>}
      </Section>

      <Section id="prereqs" title="Prerequisites & artifacts">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="card">
            <h3 className="font-semibold">Prerequisites</h3>
            <Checklist items={g.prerequisites} />
          </div>
          <div className="card">
            <h3 className="font-semibold">Artifacts to have ready</h3>
            <Checklist items={g.artifacts} />
          </div>
        </div>
      </Section>

      <Section id="steps" title="Setup steps">
        <div className="table-wrap mb-4">
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Human</th><th>Either</th><th>Human-only steps</th></tr></thead>
            <tbody>
              <tr>
                <td>{count("agent")}</td>
                <td>{count("human")}</td>
                <td>{count("either")}</td>
                <td>{humanSteps.length ? humanSteps.map(({ s, n }) => <div key={n}><a href={`#step-${n}`}>{n}. {s.title}</a></div>) : "None"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ol className="grid gap-3">
          {g.steps.map((s, i) => (
            <li key={i} id={`step-${i + 1}`} className="card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-subtle text-xs font-semibold border border-border">{i + 1}</span>
                <span className="font-semibold">{s.title}</span>
                <Chip tone={OWNER[s.owner].tone}>{OWNER[s.owner].label}</Chip>
              </div>
              <p className="mt-2 text-sm whitespace-pre-line">{s.details}</p>
              {s.ownerNote && <p className="mt-1 text-sm text-muted">Owner note: {s.ownerNote}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                {s.url && <a href={s.url}>Official link</a>}
                <EvidenceBadges claimIds={s.claimIds} claims={claims} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="blockers" title="Blockers">
        {g.blockers.length ? (
          <ul className="grid gap-3">
            {g.blockers.map((b, i) => (
              <li key={i} className="card">
                <div className="font-semibold">{b.title}</div>
                <p className="mt-1 text-sm">{b.description}</p>
                <p className="mt-1 text-sm"><span className="label">Recovery</span> {b.recovery}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {b.escalationUrl && <a href={b.escalationUrl}>Escalation</a>}
                  <EvidenceBadges claimIds={b.claimIds} claims={claims} />
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">None recorded.</p>}
      </Section>

      <Section id="unresolved" title="Unresolved uncertainty">
        <Bullets items={g.unresolved} />
      </Section>

      <Section id="evidence" title="Evidence">
        <Legend />
        <EvidenceTable claims={claims} />
      </Section>

      {g.researchLog.length > 0 && (
        <section className="section">
          <details className="card">
            <summary className="font-semibold">Research log ({g.researchLog.length})</summary>
            <ol className="mt-2 list-decimal pl-5 text-sm space-y-1">
              {g.researchLog.map((l, i) => <li key={i}>{l}</li>)}
            </ol>
          </details>
        </section>
      )}
    </article>
  );
}

function Checklist({ items }: { items: string[] }) {
  if (!items.length) return <p className="mt-2 text-sm text-muted">None recorded.</p>;
  return (
    <ul className="mt-2 space-y-1.5 text-sm">
      {items.map((x, i) => (
        <li key={i}><label className="flex gap-2"><input type="checkbox" className="mt-1 shrink-0" /> <span>{x}</span></label></li>
      ))}
    </ul>
  );
}

function Legend() {
  return (
    <details className="box mb-4 text-sm">
      <summary className="font-medium">How to read evidence</summary>
      <p className="mt-2">Every claim has a <strong>status</strong> (does the source actually support it?) and a separate <strong>category</strong> (where it came from).</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <ul className="space-y-1">
          {Object.entries(STATUS).map(([k, v]) => <li key={k}><Chip tone={v.tone}>{v.label}</Chip> {v.help}</li>)}
        </ul>
        <ul className="space-y-1">
          {Object.entries(CATEGORY).map(([k, v]) => <li key={k}><Chip tone="outline">{v.label}</Chip> {v.help}</li>)}
        </ul>
      </div>
      <p className="mt-2 text-muted">An &quot;official doc&quot; source is not the same as verified. Only firsthand tests were observed directly.</p>
    </details>
  );
}

function EvidenceTable({ claims }: { claims: Claim[] }) {
  if (!claims.length) return <p className="text-sm text-muted">No claims recorded.</p>;
  return (
    <div className="table-wrap">
      <table className="tbl">
        <thead><tr><th>ID</th><th>Status</th><th>Category</th><th>Claim</th><th>Source</th><th>Checked</th></tr></thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id} id={`claim-${c.id}`}>
              <td className="font-mono text-xs whitespace-nowrap">{c.id.replace(/^.*-(c\d+)$/, "$1")}</td>
              <td><Chip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Chip></td>
              <td><Chip tone="outline">{CATEGORY[c.category].label}</Chip></td>
              <td className="min-w-[16rem]">
                {c.excerpt ? (
                  <details>
                    <summary>{c.text}</summary>
                    <blockquote className="mt-1 border-l-2 border-border pl-2 text-muted">{c.excerpt}</blockquote>
                  </details>
                ) : c.text}
                {c.setupAttemptRef && <div className="mt-1 text-xs text-muted">Setup attempt: {c.setupAttemptRef}</div>}
              </td>
              <td>{c.sourceUrl ? <a href={c.sourceUrl} className="break-all">{new URL(c.sourceUrl).hostname}</a> : <span className="text-muted">—</span>}</td>
              <td className="whitespace-nowrap">{c.dateChecked}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
