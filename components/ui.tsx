import type { Claim, Guide, Timing } from "@/lib/schema";

type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "outline";

export function Chip({ tone = "neutral", children, title }: { tone?: Tone; children: React.ReactNode; title?: string }) {
  return <span className={`chip${tone === "neutral" ? "" : ` chip-${tone}`}`} title={title}>{children}</span>;
}

export const STATUS: Record<Claim["status"], { label: string; tone: Tone; help: string }> = {
  supported: { label: "supported", tone: "ok", help: "The cited source or firsthand test directly supports the claim." },
  partially_supported: { label: "partial", tone: "warn", help: "The source supports part of the claim; the rest is inferred or unstated." },
  unverified: { label: "unverified", tone: "neutral", help: "No source confirming the claim was found." },
  conflicting: { label: "conflicting", tone: "bad", help: "Sources disagree." },
};

export const CATEGORY: Record<Claim["category"], { label: string; help: string }> = {
  firsthand_test: { label: "firsthand", help: "Observed during a real setup attempt (see setup notes)." },
  official_doc: { label: "official doc", help: "From the provider's own documentation. Official does not mean verified: docs can be stale or vague." },
  community: { label: "community", help: "Forums, blog posts, issue trackers." },
  inference: { label: "inference", help: "Reasoned from other evidence; not stated anywhere directly." },
};

export const DIFFICULTY: Record<Guide["difficulty"]["level"], { label: string; tone: Tone }> = {
  low: { label: "Low", tone: "ok" },
  medium: { label: "Medium", tone: "info" },
  high: { label: "High", tone: "warn" },
  very_high: { label: "Very high", tone: "bad" },
};

export const REGISTRATION: Record<Guide["registration"]["availability"], { label: string; tone: Tone }> = {
  public: { label: "Public registration", tone: "ok" },
  partner_only: { label: "Partner only", tone: "bad" },
  undocumented: { label: "Registration undocumented", tone: "warn" },
  unknown: { label: "Registration unknown", tone: "neutral" },
};

export const ACCESS: Record<Guide["scopes"][number]["access"], { label: string; tone: Tone }> = {
  public: { label: "public", tone: "ok" },
  requires_review: { label: "requires review", tone: "warn" },
  restricted: { label: "restricted", tone: "bad" },
  unknown: { label: "unknown", tone: "neutral" },
};

export const APPLIES: Record<Guide["reviewStages"][number]["applies"], { label: string; tone: Tone }> = {
  always: { label: "always", tone: "warn" },
  conditional: { label: "conditional", tone: "info" },
  never: { label: "never", tone: "outline" },
};

export const OWNER: Record<Guide["steps"][number]["owner"], { label: string; tone: Tone }> = {
  agent: { label: "Agent", tone: "info" },
  human: { label: "Human", tone: "warn" },
  either: { label: "Either", tone: "neutral" },
};

export function OriginChip({ origin }: { origin: Guide["origin"] }) {
  return origin === "curated"
    ? <Chip tone="outline" title="Researched and reviewed by hand">curated</Chip>
    : <Chip tone="outline" title="Produced by the automated research workflow">generated</Chip>;
}

/** Display string for a timing; never invents a value. */
export function timingText(t: Timing, unknownLabel: string) {
  return t.kind === "unknown" || !t.value ? unknownLabel : t.value;
}

/** Status-colored inline claim chips linking to the evidence table. */
export function EvidenceBadges({ claimIds, claims }: { claimIds: string[]; claims: Claim[] }) {
  if (!claimIds.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {claimIds.map((id) => {
        const c = claims.find((x) => x.id === id);
        const short = id.replace(/^.*-(c\d+)$/, "$1");
        const s = c ? STATUS[c.status] : null;
        return (
          <a key={id} href={`#claim-${id}`} className={`chip${s && s.tone !== "neutral" ? ` chip-${s.tone}` : ""}`} title={c?.text ?? "Missing claim"}>
            {short} {s?.label ?? "missing"}
          </a>
        );
      })}
    </span>
  );
}

export function TimingIndicator({ label, timing, unknownLabel, claims }: { label: string; timing: Timing; unknownLabel: string; claims: Claim[] }) {
  return (
    <div className="card flex-1 min-w-0">
      <div className="label">{label}</div>
      <div className="mt-1 text-lg font-semibold">{timingText(timing, unknownLabel)}</div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
        <Chip tone={timing.kind === "observed" ? "ok" : timing.kind === "documented" ? "info" : timing.kind === "estimated" ? "warn" : "neutral"}>{timing.kind}</Chip>
        <EvidenceBadges claimIds={timing.claimIds} claims={claims} />
      </div>
      {timing.basis && <p className="mt-2 text-sm text-muted">{timing.basis}</p>}
    </div>
  );
}
