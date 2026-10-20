import { isIP } from "node:net";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { AppError, ConfigError } from "./errors";
import { jsonCall } from "./llm";
import { safeFetch, textContainsExcerpt } from "./safeFetch";
import { search, type SearchResult } from "./search";
import { Guide, validateGuide, type Claim } from "./schema";
import { ensureSchema, saveGuide } from "./db";

export type Stage = "identify" | "search" | "fetch" | "extract" | "validate" | "save";
export type ResearchEvent =
  | { type: "progress"; stage: Stage; message: string }
  | { type: "candidates"; candidates: { name: string; website: string; reason: string }[] }
  | { type: "done"; slug: string; url: string };

const DEADLINE_MS = 240_000;
const MAX_URLS = 8;
const PAGE_CHARS_FOR_MODEL = 7_000;
const TOPICS = ["registration", "scopes", "review", "testing", "distribution", "timing", "redirect", "other"] as const;
type Topic = (typeof TOPICS)[number];
const GAP_TOPICS: [Topic, string][] = [
  ["registration", "how to register an OAuth app"], ["scopes", "OAuth scopes or permissions"], ["review", "app review or verification"],
  ["testing", "what can be tested before review"], ["redirect", "redirect URI configuration"], ["timing", "review or approval timing"],
];

const slugify = (s: string, max = 40) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "") || "x";
const today = () => new Date().toISOString().slice(0, 10);
const hostOf = (u: string) => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; } };
// ponytail: last-two-labels heuristic for the registrable domain; breaks for co.uk-style TLDs (handled crudely below).
function baseDomain(host: string) {
  const parts = host.split(".");
  const n = parts.length >= 3 && parts[parts.length - 2].length <= 3 && parts[parts.length - 1].length === 2 ? 3 : 2;
  return parts.slice(-n).join(".");
}
const normUrl = (u: string) => { try { const x = new URL(u); x.hash = ""; return x.href.replace(/\/$/, ""); } catch { return u; } };
const wrap = (url: string, body: string, fetched: boolean) =>
  `<source url="${url.replace(/"/g, "%22")}" fetched="${fetched}">\n${body.replace(/<\/source>/gi, "</ source>")}\n</source>`;

function parseDomainInput(q: string): string | null {
  const t = q.trim();
  if (/\s/.test(t)) return null;
  const m = t.match(/^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]\S*)?$/i);
  return m ? (/^https?:\/\//i.test(t) ? t : `https://${t}`) : null;
}
const nameFromHost = (host: string) => {
  const label = baseDomain(host).split(".")[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// --- LLM output schemas ----------------------------------------------------
const CandidatesOut = z.object({
  candidates: z.array(z.object({ name: z.string().min(1), website: z.string().url(), confidence: z.number().min(0).max(1), reason: z.string() })).min(1).max(5),
});
const ClaimsOut = z.object({
  useCase: z.string().min(3).max(120),
  claims: z.array(z.object({ text: z.string().min(10), sourceUrl: z.string().url(), excerpt: z.string().min(1).max(400), topic: z.enum(TOPICS) })).max(30),
});
// The model writes everything except fields the workflow owns.
const SynthOut = Guide.omit({ slug: true, schemaVersion: true, origin: true, claims: true, lastResearched: true, researchLog: true });

// Recursively drop claimIds that aren't real claim ids.
function stripUnknownClaimIds(node: unknown, ids: Set<string>): void {
  if (Array.isArray(node)) return node.forEach((n) => stripUnknownClaimIds(n, ids));
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "claimIds" && Array.isArray(v)) (node as Record<string, unknown>)[k] = v.filter((id) => typeof id === "string" && ids.has(id));
      else stripUnknownClaimIds(v, ids);
    }
  }
}

export async function runResearch(input: { query: string; website?: string }, emit: (ev: ResearchEvent) => void): Promise<{ slug: string | null }> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { timedOut = true; reject(new AppError("timeout", `Research exceeded the ${DEADLINE_MS / 1000}s budget and was stopped. Nothing was saved; try a more specific provider name.`)); }, DEADLINE_MS);
  });
  const checkpoint = () => { if (timedOut) throw new AppError("timeout", "Research deadline reached."); };
  try {
    return await Promise.race([pipeline(input, emit, checkpoint), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function pipeline(input: { query: string; website?: string }, emit: (ev: ResearchEvent) => void, checkpoint: () => void): Promise<{ slug: string | null }> {
  const query = input.query.trim();
  if (!query || query.length > 200 || /[\r\n]/.test(query)) throw new AppError("bad_input", "Query must be 1–200 characters on a single line.");
  // Fail fast before spending any upstream calls.
  for (const k of ["TAVILY_API_KEY", "GEMINI_API_KEY", "DATABASE_URL"]) if (!process.env[k]) throw new ConfigError(k);

  const log: string[] = [];
  let toolCalls = 0;
  const progress = (stage: Stage, message: string) => emit({ type: "progress", stage, message });

  // Providers always have a public domain, so IP literals and local names are refused before any upstream call.
  for (const raw of [query, input.website]) {
    if (!raw) continue;
    let host = "";
    try { host = new URL(raw.includes("://") ? raw : `http://${raw.split(/\s/)[0]}`).hostname.replace(/^\[|\]$/g, ""); } catch { continue; }
    if (isIP(host) || /^localhost$|\.(local|localhost|internal|test)$/i.test(host))
      throw new AppError("bad_input", "Enter a provider name or its public website. IP addresses and local hostnames are not accepted.");
  }

  // --- identify ---------------------------------------------------------------
  progress("identify", `Identifying the provider for "${query}"`);
  let website = input.website ?? parseDomainInput(query);
  let name: string;
  if (website) {
    const host = hostOf(website);
    if (!host) throw new AppError("bad_input", "Website must be a valid http(s) URL.");
    name = nameFromHost(host);
    log.push(`identify: used provided website ${website}`);
  } else {
    toolCalls++;
    const hits = await search(`"${query}" official site developer API`, { maxResults: 5 });
    log.push(`search: "${query}" official site developer API → ${hits.length} results`);
    toolCalls++;
    const { candidates } = await jsonCall(CandidatesOut,
      "You identify which software provider/platform a developer means, so we can research how to register an OAuth app with it. Prefer the provider's canonical homepage URL as website.",
      `Developer query: ${JSON.stringify(query)}\n\nSearch results:\n${hits.map((h) => wrap(h.url, `${h.title}\n${h.snippet}`, false)).join("\n")}\n\nReturn {"candidates":[{"name","website","confidence":0-1,"reason"}]} ordered by confidence. Include alternatives if the query is ambiguous.`,
      { maxTokens: 2000 });
    candidates.sort((a, b) => b.confidence - a.confidence);
    const [top, second] = candidates;
    // ponytail: model confidences vary run to run, so any plausible runner-up (>= 0.5) triggers clarification.
    if (top.confidence < 0.7 || (second && (second.confidence >= 0.5 || top.confidence - second.confidence < 0.15))) {
      progress("identify", `"${query}" is ambiguous; pick the provider you meant`);
      emit({ type: "candidates", candidates: candidates.map(({ name, website, reason }) => ({ name, website, reason })) });
      return { slug: null };
    }
    website = top.website; name = top.name;
    log.push(`identify: chose ${name} (${website}), confidence ${top.confidence}`);
  }
  const domain = baseDomain(hostOf(website));
  const isOfficial = (u: string) => { const h = hostOf(u); return h === domain || h.endsWith(`.${domain}`); };
  progress("identify", `Researching ${name} (${domain})`);
  checkpoint();

  // --- search -----------------------------------------------------------------
  const queries = [
    `${name} OAuth app registration developer`, `${name} API OAuth scopes permissions`, `${name} app review verification publish distribution`,
    `${name} developer portal redirect URI`, `${name} API partner access program`,
  ];
  progress("search", `Running ${queries.length} searches for official docs`);
  const settled = await Promise.allSettled(queries.map((q) => { toolCalls++; return search(q, { maxResults: 5 }); }));
  const seen = new Map<string, SearchResult>();
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      if (r.reason instanceof AppError && (r.reason.code === "rate_limited" || r.reason.code === "missing_config")) throw r.reason;
      log.push(`search failed: "${queries[i]}" (${(r.reason as Error)?.message ?? r.reason})`);
      return;
    }
    log.push(`search: "${queries[i]}" → ${r.value.length} results`);
    for (const hit of r.value) { const k = normUrl(hit.url); if (!seen.has(k)) seen.set(k, { ...hit, url: k }); }
  });
  const ranked = [...seen.values()].sort((a, b) => Number(isOfficial(b.url)) - Number(isOfficial(a.url)));
  const picked = ranked.slice(0, MAX_URLS);
  progress("search", `Found ${seen.size} unique URLs; keeping ${picked.length} (${picked.filter((p) => isOfficial(p.url)).length} on ${domain})`);
  checkpoint();

  // --- fetch (concurrency 4) ----------------------------------------------------
  progress("fetch", `Fetching ${picked.length} pages`);
  const pages = new Map<string, { title: string; text: string }>(); // keyed by normalized original and final URL
  const fetchedList: { url: string; title: string; text: string }[] = [];
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, picked.length) }, async () => {
    while (next < picked.length) {
      const hit = picked[next++];
      toolCalls++;
      try {
        const p = await safeFetch(hit.url);
        if (p.text.length < 200) throw new Error("page had almost no text (likely JS-rendered)");
        pages.set(normUrl(hit.url), p); pages.set(normUrl(p.finalUrl), p);
        fetchedList.push({ url: hit.url, title: p.title, text: p.text });
        log.push(`fetched: ${hit.url}${p.finalUrl !== hit.url ? ` → ${p.finalUrl}` : ""} (${p.text.length} chars)`);
      } catch (e) {
        log.push(`fetch failed: ${hit.url} (${(e as Error).message})`);
      }
    }
  }));
  const unfetched = picked.filter((p) => !pages.has(p.url));
  if (!fetchedList.length && !unfetched.some((u) => u.snippet)) throw new AppError("insufficient_evidence", `Could not fetch any pages or find search snippets about ${name}'s OAuth setup. Nothing was saved.`);
  progress("fetch", `Fetched ${fetchedList.length}/${picked.length} pages${fetchedList.length ? "" : "; continuing with search snippets only (claims will be unverified)"}`);
  checkpoint();

  // --- extract ------------------------------------------------------------------
  progress("extract", `Extracting claims from ${fetchedList.length} pages`);
  const sources = [
    ...fetchedList.map((p) => wrap(p.url, `${p.title}\n${p.text.slice(0, PAGE_CHARS_FOR_MODEL)}`, true)),
    ...unfetched.filter((u) => u.snippet).map((u) => wrap(u.url, `${u.title}\n${u.snippet}`, false)),
  ];
  toolCalls++;
  const extracted = await jsonCall(ClaimsOut,
    `You extract factual claims about registering and shipping an OAuth app with ${name}, for a developer building an AI agent that acts on behalf of users. Keep distinct: registering the developer's OAuth app vs each end user's authorization; testing vs public distribution; provider review vs org-admin consent; applying vs approval.
Rules: every claim must cite exactly one sourceUrl from the provided sources, and "excerpt" must be copied VERBATIM from that source (≤300 chars, no paraphrase, no ellipses). Do not use outside knowledge. Prefer official ${domain} pages. Topics: registration|scopes|review|testing|distribution|timing|redirect|other. Timing claims only when the source states a figure.`,
    `Developer query: ${JSON.stringify(query)}\nProvider: ${name} (${website})\n\nSources:\n${sources.join("\n\n")}\n\nReturn {"useCase": short phrase for what the developer wants (e.g. "read Gmail messages"), "claims":[{"text","sourceUrl","excerpt","topic"}]} with up to 25 of the most useful claims.`,
    { maxTokens: 8000 });

  const useCase = extracted.useCase;
  const slug = `${slugify(name, 30)}-${slugify(useCase, 40)}-${randomBytes(3).toString("hex")}`;
  const date = today();
  const topicById = new Map<string, Topic>();
  const claims: Claim[] = extracted.claims.map((c, i) => {
    const id = `${slug}-c${i + 1}`;
    topicById.set(id, c.topic);
    const page = pages.get(normUrl(c.sourceUrl));
    // A quote the model returns that is NOT on the fetched page may be fabricated, so it is unverified,
    // not "partially supported". partially_supported is reserved for human judgement (see FACT-CHECK).
    const verified = !!page && textContainsExcerpt(page.text, c.excerpt);
    const status = verified ? "supported" : "unverified";
    const excerpt = verified ? c.excerpt
      : page ? `[Not found verbatim on the fetched page] ${c.excerpt}`
      : `[Source page not fetched; based on search snippet] ${c.excerpt}`;
    return { id, text: c.text, status, category: isOfficial(c.sourceUrl) ? "official_doc" : "community", sourceUrl: c.sourceUrl, excerpt, dateChecked: date };
  });
  const count = (s: string) => claims.filter((c) => c.status === s).length;
  log.push(`extract: ${claims.length} claims (${count("supported")} supported, ${count("unverified")} unverified)`);
  progress("extract", `Extracted ${claims.length} claims: ${count("supported")} verified verbatim on the source page, ${count("unverified")} unverified`);
  if (!claims.length) throw new AppError("insufficient_evidence", `No usable claims about ${name}'s OAuth app setup were found in the fetched sources. Nothing was saved.`);
  checkpoint();

  // --- gaps ---------------------------------------------------------------------
  const backed = (topic: Topic, statuses = ["supported"]) => claims.some((c) => topicById.get(c.id) === topic && statuses.includes(c.status));
  const gaps = GAP_TOPICS.filter(([t]) => !backed(t)).map(([, label]) => `No official page found describing ${label}.`);
  progress("validate", gaps.length ? `Evidence gaps: ${gaps.length} topic(s) lack verified sources` : "All core topics have at least one sourced claim");

  // --- synthesize -----------------------------------------------------------------
  progress("validate", "Drafting the guide from verified claims");
  const ids = new Set(claims.map((c) => c.id));
  const assemble = (out: z.infer<typeof SynthOut>) => ({
    ...out, slug, schemaVersion: 1 as const, origin: "generated" as const, claims, lastResearched: date, researchLog: log,
    unresolved: [...new Set([...gaps, ...out.unresolved])],
  });
  toolCalls++;
  const draft = await jsonCall(SynthOut,
    `You write a dense, practical OAuth setup guide for a developer building an AI agent that acts on behalf of users with ${name}. You may ONLY cite the claim ids provided; you cannot add claims. Every factual statement should cite claimIds; anything without a claim is an assessment and must be worded as such.
Rules:
- providerWait: kind "documented" only if a cited claim states the provider's published figure; otherwise kind "unknown", value "Not published". Never "observed".
- handsOnEffort: kind "estimated" with a value and a basis.
- reviewStages[].wait follows the same rules as providerWait.
- registration.availability: "public"/"partner_only" only if a supported registration claim backs it; otherwise "undocumented" or "unknown", and say so in the summary.
- steps.owner: "human" for logins, MFA, payment, legal attestations, review submissions (add ownerNote); "agent" for API/config work; else "either".
- difficulty is an assessment; the rationale explains what drives it.
- unresolved: honest list of what could not be confirmed. Use only real URLs from the claims or provider site for url fields.
JSON Schema of the required output:
${JSON.stringify(z.toJSONSchema(SynthOut, { io: "input" }))}`,
    `Developer query: ${JSON.stringify(query)}\nProvider: ${name}, website ${website}\nUse case: ${useCase}\nToday: ${date}\n\nClaims (the only citable evidence):\n${JSON.stringify(claims.map((c) => ({ id: c.id, topic: topicById.get(c.id), status: c.status, category: c.category, text: c.text, sourceUrl: c.sourceUrl })), null, 1)}\n\nKnown evidence gaps:\n${gaps.map((g) => `- ${g}`).join("\n") || "- none"}`,
    {
      maxTokens: 16000,
      extraCheck: (out) => { try { return validateGuide(assemble(out)).errors; } catch (e) { return [(e as Error).message.slice(0, 500)]; } },
    });
  checkpoint();

  // --- programmatic enforcement --------------------------------------------------------
  const guide = assemble(structuredClone(draft));
  stripUnknownClaimIds(guide, ids);
  const supports = (claimIds: string[]) => claimIds.some((id) => claims.find((c) => c.id === id && c.status !== "unverified"));
  const fixWait = (t: { kind: string; value?: string; claimIds: string[] }, where: string) => {
    if (t.kind === "observed" || (t.kind === "documented" && !supports(t.claimIds)) || t.kind === "estimated") {
      log.push(`enforce: ${where} kind "${t.kind}" had no supporting claim → unknown`);
      t.kind = "unknown";
    }
    if (t.kind === "unknown") t.value = "Not published";
  };
  fixWait(guide.providerWait, "providerWait");
  guide.reviewStages.forEach((r, i) => fixWait(r.wait, `reviewStages[${i}].wait`));
  if (guide.handsOnEffort.kind === "observed" || (guide.handsOnEffort.kind === "documented" && !supports(guide.handsOnEffort.claimIds))) guide.handsOnEffort.kind = "estimated";
  if (!backed("registration", ["supported"])) {
    if (guide.registration.availability === "public" || guide.registration.availability === "partner_only") {
      log.push(`enforce: registration.availability "${guide.registration.availability}" lacked a verified claim → ${backed("registration", ["unverified"]) ? "unknown" : "undocumented"}`);
      guide.registration.availability = backed("registration", ["unverified"]) ? "unknown" : "undocumented";
    }
    if (!/not (been )?verified|undocumented|could not (be )?(confirm|verif)/i.test(guide.registration.summary))
      guide.registration.summary = `Registration process could not be verified against an official page during research. ${guide.registration.summary}`;
  }
  log.push(`budget: ${toolCalls} tool calls (searches, fetches, model calls)`);
  const { guide: final, errors } = validateGuide(guide);
  if (errors.length) throw new AppError("malformed_output", `Generated guide failed final validation: ${errors.slice(0, 5).join("; ")}`);
  progress("validate", `Guide validated: ${final.claims.length} claims, ${final.steps.length} steps, ${final.unresolved.length} unresolved items`);

  // --- save -------------------------------------------------------------------------
  progress("save", "Saving guide");
  await ensureSchema();
  await saveGuide(final);
  emit({ type: "done", slug, url: `/g/${slug}` });
  return { slug };
}
