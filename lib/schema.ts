import { z } from "zod";

// Claim-level provenance. Category (where it came from) is independent of
// status (whether the content actually supports the claim).
export const ClaimStatus = z.enum(["supported", "partially_supported", "unverified", "conflicting"]);
export const EvidenceCategory = z.enum(["firsthand_test", "official_doc", "community", "inference"]);

export const Claim = z.object({
  id: z.string().regex(/^[a-z0-9-]+-c\d+$/, "claim id like github-oauth-app-c1"),
  text: z.string().min(10),
  status: ClaimStatus,
  category: EvidenceCategory,
  sourceUrl: z.string().url().optional(),
  excerpt: z.string().optional(), // quoted supporting text or firsthand observation
  dateChecked: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  setupAttemptRef: z.string().optional(), // e.g. "setup-notes/github.md#attempt-1"
});

// Timing is never invented. kind=unknown means "Not published".
export const Timing = z.object({
  kind: z.enum(["observed", "documented", "estimated", "unknown"]),
  value: z.string().optional(), // "30-60 min", "4-6 weeks"
  basis: z.string().optional(), // why we believe it
  claimIds: z.array(z.string()).default([]),
});

export const Owner = z.enum(["agent", "human", "either"]);

export const Step = z.object({
  title: z.string(),
  details: z.string(),
  url: z.string().url().optional(),
  owner: Owner,
  ownerNote: z.string().optional(), // why a human must do it (login, MFA, legal attestation)
  claimIds: z.array(z.string()).default([]),
});

export const Scope = z.object({
  name: z.string(),
  purpose: z.string(),
  access: z.enum(["public", "requires_review", "restricted", "unknown"]),
  claimIds: z.array(z.string()).default([]),
});

export const ReviewStage = z.object({
  name: z.string(),
  trigger: z.string(), // what makes this stage apply
  applies: z.enum(["always", "conditional", "never"]),
  wait: Timing,
  url: z.string().url().optional(),
  claimIds: z.array(z.string()).default([]),
});

export const Blocker = z.object({
  title: z.string(),
  description: z.string(),
  recovery: z.string(),
  escalationUrl: z.string().url().optional(),
  claimIds: z.array(z.string()).default([]),
});

export const Guide = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  schemaVersion: z.literal(1),
  origin: z.enum(["curated", "generated"]),
  provider: z.object({
    name: z.string(),
    website: z.string().url(),
    developerPortal: z.string().url().optional(),
    docsHome: z.string().url().optional(),
  }),
  title: z.string(),
  useCase: z.string(),
  audience: z.string(),
  assumptions: z.array(z.string()),
  registration: z.object({
    availability: z.enum(["public", "partner_only", "undocumented", "unknown"]),
    summary: z.string(),
    claimIds: z.array(z.string()).default([]),
  }),
  scopes: z.array(Scope),
  // Assessments, not facts. Always rendered with "assessment" label + rationale.
  difficulty: z.object({
    level: z.enum(["low", "medium", "high", "very_high"]),
    rationale: z.string(),
  }),
  handsOnEffort: Timing,
  providerWait: Timing,
  reviewStages: z.array(ReviewStage),
  prerequisites: z.array(z.string()),
  artifacts: z.array(z.string()), // things you must have ready: privacy policy URL, logo, redirect URI...
  steps: z.array(Step).min(1),
  testing: z.object({
    availableNow: z.array(z.string()),
    restrictions: z.array(z.string()),
    claimIds: z.array(z.string()).default([]),
  }),
  launch: z.object({
    requirements: z.array(z.string()),
    claimIds: z.array(z.string()).default([]),
  }),
  blockers: z.array(Blocker),
  nextActions: z.array(z.string()).min(1),
  claims: z.array(Claim),
  unresolved: z.array(z.string()),
  lastResearched: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  researchLog: z.array(z.string()).default([]), // generated guides: what the workflow did
});

export type Guide = z.infer<typeof Guide>;
export type Claim = z.infer<typeof Claim>;
export type Timing = z.infer<typeof Timing>;
export type Step = z.infer<typeof Step>;

// Cross-reference check: every claimId used anywhere must exist in guide.claims.
export function validateGuide(input: unknown): { guide: Guide; errors: string[] } {
  const guide = Guide.parse(input);
  const ids = new Set(guide.claims.map((c) => c.id));
  const errors: string[] = [];
  const check = (where: string, list: string[]) =>
    list.forEach((id) => !ids.has(id) && errors.push(`${where} references unknown claim ${id}`));
  check("registration", guide.registration.claimIds);
  guide.scopes.forEach((s, i) => check(`scopes[${i}]`, s.claimIds));
  check("handsOnEffort", guide.handsOnEffort.claimIds);
  check("providerWait", guide.providerWait.claimIds);
  guide.reviewStages.forEach((r, i) => { check(`reviewStages[${i}]`, r.claimIds); check(`reviewStages[${i}].wait`, r.wait.claimIds); });
  guide.steps.forEach((s, i) => check(`steps[${i}]`, s.claimIds));
  check("testing", guide.testing.claimIds);
  check("launch", guide.launch.claimIds);
  guide.blockers.forEach((b, i) => check(`blockers[${i}]`, b.claimIds));
  for (const c of guide.claims) {
    if (c.category === "firsthand_test" && !c.setupAttemptRef) errors.push(`${c.id}: firsthand_test requires setupAttemptRef`);
    if (c.status === "supported" && c.category !== "firsthand_test" && (!c.sourceUrl || !c.excerpt))
      errors.push(`${c.id}: supported claim needs sourceUrl and excerpt`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.dateChecked)) errors.push(`${c.id}: bad date`);
  }
  const prefix = guide.slug + "-c";
  guide.claims.forEach((c) => !c.id.startsWith(prefix) && errors.push(`${c.id}: id must start with ${prefix}`));
  return { guide, errors };
}

// Evidence coverage summary, shown in library cards. Counts, not a score.
export function coverage(g: Guide) {
  const by = (k: keyof Claim, v: string) => g.claims.filter((c) => c[k] === v).length;
  return {
    total: g.claims.length,
    supported: by("status", "supported"),
    partial: by("status", "partially_supported"),
    unverified: by("status", "unverified"),
    conflicting: by("status", "conflicting"),
    firsthand: by("category", "firsthand_test"),
  };
}
