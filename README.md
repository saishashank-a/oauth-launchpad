# OAuth Launchpad

Guides for developers building AI agents who need their **own** provider OAuth app. Each guide covers one use case and one scope set. It answers what you can test today, what must happen before real users can connect, how much hands-on work to expect, which reviews or waits apply, what can block you, and which steps an agent can do versus a human. Factual claims carry their own evidence.

> **Submission status: incomplete.** See [Limitations](#limitations). The app runs locally with durable Postgres storage, and live generation has been tested end to end with Gemini and Tavily. It is not deployed yet: the Vercel CLI token on the build machine had expired.

## Concepts the guides keep separate

| Term | Meaning here |
|---|---|
| **OAuth app** | The client you register with the provider: client ID, secret, redirect URIs, branding. You own it. |
| **Integration** | Your product's code and config that use that app, for example a Composio auth config that points at your client ID. |
| **Connection** | One end user's authorization, which yields tokens for that user. Many connections share one app. |
| **Testing vs distribution** | Testing means you or listed test users authorize the app. Distribution means arbitrary external users or workspaces can. |
| **Provider review vs admin consent** | Review is the provider vetting your app, such as Google verification or Slack Marketplace review. Admin consent is a customer's own admin allowing your app in their org, such as Entra admin consent or GitHub org app approval. Passing one does not give you the other. |
| **Managed vs own app** | A managed app is registered by a platform like Composio, so its name appears on consent, its scopes are defaults, and its quota is shared. Your own app needs registration and any review, but carries your brand and your scopes. See [Composio managed auth](https://docs.composio.dev/toolkits/managed-auth). |

## Local setup

```bash
npm install
cp .env.example .env.local      # fill DATABASE_URL at minimum
npm run validate                # schema + evidence-rule checks on data/guides/*.json
npm run seed                    # upsert curated guides into Postgres
npm run dev                     # http://localhost:3000
```

| Variable | Needed for |
|---|---|
| `DATABASE_URL` | Guide storage and share URLs. Use a Supabase pooled connection string on port 6543. Without it, pages read the curated JSON files read-only. |
| `GEMINI_API_KEY` | Live generation: claim extraction and guide drafting. The free tier works; get a key at https://aistudio.google.com/apikey. |
| `TAVILY_API_KEY` | Live generation: web search. The free plan gives 1,000 searches a month; sign up at https://app.tavily.com. |
| `GENERATE_RATE_LIMIT_PER_HOUR` | Per-IP limit. Defaults to 5. |

Without the two API keys, the generate endpoint returns a `missing_config` error. There is no mock fallback.

Other checks:

```bash
npx tsc --noEmit
npm run build
npx tsx scripts/check-safefetch.mts   # SSRF guard: rejects localhost, private ranges, metadata IP, odd ports
```

## Architecture

```
app/page.tsx              library: search, cards, generate form
app/g/[slug]/page.tsx     guide page, the shareable URL
app/notes|audit|agent-log setup notes, fact-check audit, agent work log (rendered from docs/)
app/api/generate          POST {query, website?} -> NDJSON progress stream
lib/schema.ts             Zod Guide schema + validateGuide() cross-reference/evidence checks
lib/research.ts           research workflow (below)
lib/safeFetch.ts          SSRF-safe fetch + verbatim excerpt matcher
lib/search.ts, lib/llm.ts Tavily search; Gemini Interactions API in JSON mode, Zod validation, one repair retry, per-model quota fallback
lib/db.ts                 Postgres: one `guides` table, jsonb body, slug primary key
data/guides/*.json        curated guides (source of truth, seeded into the DB)
```

**Research workflow.** Research, synthesis and validation are separate steps, so missing evidence shows up instead of being papered over.

1. **Identify.** A URL or domain is used as given. A name is searched, and the model proposes candidate identities. If confidence is low or two candidates are close, the endpoint returns them for the user to pick, and nothing is saved.
2. **Search.** Up to five fixed queries cover registration, scopes, review, redirect URIs and partner programs. Results from the official domain rank first, and at most 8 URLs are kept.
3. **Fetch.** Each URL goes through `safeFetch`, four at a time. Failures are logged, not hidden.
4. **Extract.** The model returns claims with a source URL and a verbatim excerpt. **Code, not the model, sets the status.** If the excerpt is found on the fetched page, the claim is `supported`. Otherwise it is `unverified`. Category comes from the domain: official doc or community.
5. **Gaps.** Topics with no supported claim go into `unresolved`. If registration has no supported claim, availability is forced to `undocumented` or `unknown`.
6. **Synthesize.** The model drafts the guide and may cite only the claim IDs it was given. `validateGuide` runs, and the draft gets one repair retry.
7. **Enforce.** Unknown claim IDs are stripped. A provider wait or review wait not backed by a verified claim becomes "Not published". A `firsthand_test` claim cannot be generated.
8. **Save.** The guide is upserted and the response returns `/g/<slug>`.

Budgets: a 240-second deadline, at most 6 searches (1 to identify the provider, 5 for research) and 8 fetches, 400 KB per page, 12-second timeouts, and 3 model calls plus repair retries. The rate limit is 5 per IP per hour and 30 per hour per instance.

## Evidence methodology

Each claim records an ID, text, a **status** (supported, partially supported, unverified, conflicting), a **category** (firsthand test, official doc, community, inference), a source URL, an excerpt or observation, the date checked, and a setup-attempt reference where one applies. Status and category are independent: an official page can still be ambiguous.

- **Curated guides** were written by research agents under [`docs/research-brief.md`](docs/research-brief.md). A claim is supported only if the agent fetched the page in that session and quoted it. Recollection is marked unverified inference. Agents could not mark anything firsthand.
- **Firsthand claims** come only from real browser sessions, recorded in [`docs/setup-notes/`](docs/setup-notes/) with redacted screenshots.
- **Timing** is `observed` when measured in a setup attempt, `documented` when the provider publishes a figure, `estimated` for developer effort only (always shown with its basis), and `unknown`, displayed as "Not published", otherwise.
- **Difficulty and effort** are labelled assessments in the UI and come with a rationale.
- **Fact-check:** independent agents fetched sources again and audited high-impact claims, and corrections were applied to the guides. See [`docs/FACT-CHECK.md`](docs/FACT-CHECK.md).
- `npm run validate` enforces the rules: every referenced claim exists, supported claims have a URL and excerpt, firsthand claims have a setup reference, and IDs are stable.

## Key decisions

- **Guide equals one use case plus one scope set.** Google appears twice, for sign-in and for Gmail, because their requirements differ by orders of magnitude. No provider gets a universal difficulty score.
- **JSON files for curated guides, Postgres for everything served.** Curated guides are diffable and reviewable in git. Generated guides need durable shared storage, so nothing is written to the filesystem or localStorage.
- **Code decides verification status.** The model proposes, and a string match against the fetched page decides. A model quote that is not on the page is never shown as "partially supported".
- **Tavily for search**, because it is a simple managed API. Pages are fetched by our own SSRF-guarded fetcher, so the excerpt check runs on content we retrieved ourselves.
- **No auth, no vector DB, no queue.** A single NDJSON streaming request reports real stage progress.

## Live generation test results

Run on 2026-10-20 against the local server with real Gemini and Tavily keys.

| Input | Path tested | Result |
|---|---|---|
| Pipedrive | Success | Guide saved in 117 s. 22 claims, all verified verbatim on official pipedrive.com pages. Review wait shown as "Not published". |
| Robinhood | Partial result | Guide saved. Found only per-user API keys for crypto trading. Third-party OAuth is listed as unresolved, not invented. 3 topics flagged as evidence gaps. |
| Apollo | Ambiguous name | Returned two candidates, Apollo.io and Apollo GraphQL, for the user to pick. Nothing saved. |
| Apollo, in the browser | Full UI flow | Progress streamed stage by stage, then redirected to the saved guide. |
| `http://169.254.169.254/...`, `10.0.0.1`, `[::1]`, `localhost`, `stripe.local` | Unsafe input | Rejected as bad input before any upstream call. |
| A two-line query | Bad input | Rejected. |
| 6th request in an hour | Rate limit | "Generation limit reached. Try again in about 52 minutes." |
| AWS address, before the IP fix | Timeout | Stopped at 240 s with an honest message. Nothing saved. |
| Gemini overloaded or out of quota | Upstream failure | 503 retried once. 429 moved to the next model. A clear message when all models fail. |

## Investigations and audit

- **Setup notes:** [`docs/setup-notes/`](docs/setup-notes/), shown at `/notes`.
  - GitHub: app registered, consent screen observed, measured click path.
  - Google: read-only console inspection that resolved the 100-user-cap question.
  - Slack: blocked at sign-in, with a pending checklist.
- **Fact-check audit:** [`docs/FACT-CHECK.md`](docs/FACT-CHECK.md), shown at `/audit`.
- **Agent work log:** [`docs/AGENT-LOG.md`](docs/AGENT-LOG.md), shown at `/agent-log`, plus the per-guide logs in [`docs/agent-logs/`](docs/agent-logs/).

## Limitations

- **Not deployed.** The Vercel CLI token had expired. To deploy, run `vercel login`, then `vercel link`, set the env vars with `vercel env add`, then `vercel --prod`. The guide route's `maxDuration` is 300 s, which needs a plan that allows it.
- **Free-tier model quotas are small.** Google's free tier allowed 20 requests a day on `gemini-3.8-flash` for this key, and a guide takes 3 to 5 requests. When a model hits its quota, the app moves to the next model in `GEMINI_MODELS`. Lighter fallback models produced thinner guides in testing, with 8 claims against 16 to 22.
- **Ambiguity detection depends on the model.** "Apollo" returned Apollo.io and Apollo GraphQL as choices, but one earlier run picked Apollo.io directly. "Mercury" always resolved to the bank. Any runner-up scoring 0.5 or more now triggers a choice.
- **Large providers can exceed the time budget.** A run on an AWS address ended with an honest timeout during drafting. Nothing was saved.
- **Research keeps running if the browser disconnects,** until it finishes or hits the 240-second limit.
- **The rate limit is held in memory per instance.** Use Upstash or Postgres for a global limit.
- **Firsthand coverage is thin.** There is one real registration, on GitHub. Google was read-only and Slack was blocked. Nothing was submitted for provider review, so no wait time is observed.
- **Docs drift.** Every claim has a check date. Re-run the audit before relying on timelines.
- **A missing slug renders the not-found page with HTTP 200**, because of streaming. The page is marked `noindex`.
