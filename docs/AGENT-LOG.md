# Agent work log

How this project was built, and where agents stopped and humans took over. Per-guide research logs are in `docs/agent-logs/`.

## Roles

| Role | Model | What it did |
|---|---|---|
| Owner | Claude, main session | Planned the work, wrote the schema, evidence rules and contracts. Reviewed agent output, fixed evidence-rule bugs, drove the browser setup attempts, integrated and verified. |
| Research agents, one per guide | Claude subagents | Searched and fetched official docs, wrote one guide JSON and one research log each, and ran the validator until it passed. |
| Build agents | Claude Opus subagents | One built the research workflow backend. One built the UI. Both worked against the contract in `docs/PLAN.md`. |
| Fact-check agents | Claude Opus subagents | Fetched sources again and audited high-impact claims. Folded firsthand observations into the guides. |

The user asked midway for implementation work to run on Opus, with the main session kept for planning and review.

## Tools and sources
- **Research:** web search and web fetch, with official domains preferred. Sources included docs.github.com, developers.google.com, support.google.com/cloud, learn.microsoft.com, api.slack.com and docs.slack.dev, and learn.microsoft.com/linkedin. Every supported claim quotes a page fetched in the same session.
- **Browser:** the claude-in-chrome extension, driving the user's already-signed-in Chrome. Used for the GitHub, Google and Slack setup attempts.
- **Validation:** `scripts/validate.ts` checks schema shape, cross-references between claim IDs, and evidence rules. For example, a supported claim needs a URL and an excerpt, and a firsthand claim needs a setup-attempt reference.
- **Storage:** Supabase Postgres, provisioned with the Supabase CLI.

## What was automated
- All guide research and drafting.
- The first pass of claim verification. Agents had to quote the page and could not mark anything firsthand.
- The full backend and UI, including SSRF tests for the fetcher and a dry run of the generate endpoint.
- The GitHub setup click-path: open the form, fill it, register the app, open the consent screen.
- Read-only inspection of the Google Auth Platform console.
- Screenshot redaction of client ID, usernames, avatars and org names, using Pillow.

## Where humans intervened
- **Sign-in.** The user was already signed in to GitHub and Google Cloud. The agent never handled a password, MFA code or secret.
- **Approval to submit a form.** The agent filled the GitHub registration form, then stopped and asked. The user approved, and the agent clicked "Register application".
- **Consent.** The agent opened the GitHub consent screen but did not click Authorize. Granting access is the user's decision.
- **Scope decisions.** The user stopped three research agents mid-run, then chose to relaunch them. The user chose to skip credentials for now.

## What failed or stayed uncertain
- **Session limit.** An API session limit cut off six agents partway. Two build agents and one research agent were resumed. Three research agents were relaunched from scratch. One guide had been written with the wrong field names and was rewritten.
- **Slack setup.** Blocked at sign-in. No Slack session existed in the browser, so it is pending with a manual checklist.
- **Google setup.** Read-only. The console opened an existing production project, and changing it was out of scope. No new project or client was created.
- **Model provider switch.** No Anthropic key was available, so at the user's request the model calls moved to Gemini's free tier. The first Gemini key was mis-pasted and rejected. `gemini-2.5-flash` was retired for new users, and newer models only work through the Interactions API, so the client was rewritten for it.
- **Free-tier quota.** `gemini-3.8-flash` allowed 20 requests a day. A fallback chain across models was added after the quota ran out mid-testing.
- **Live generation results.** See the test table in the README. Two fixes came out of testing. First, IP and local-host inputs were being treated as names; they are now rejected. Second, ambiguity detection was inconsistent; a stricter runner-up rule was added. One duplicate guide created during testing was deleted.
- **Deploy.** The Vercel CLI token on this machine had expired.
- **Evidence-rule bug, caught in review.** The generator first marked a model-supplied quote as "partially supported" when the quote was not on the fetched page. That would let a fabricated quote look half-verified. It now marks such claims "unverified".
- **Origin labels.** Research agents labelled curated guides as "generated" because the brief did not say. The seed script now forces "curated" for the curated folder, and the brief was updated.
- **Doc fetch limits.** The fetch tool cuts quotes at about 125 characters, so some excerpts join pieces of one page with "...". Some official pages returned 404; each guide's research log lists them.

## Safety
- Fetched pages are treated as data. Model prompts say instructions inside fetched content must be ignored. The research workflow has no tool that runs commands or reads secrets.
- The server-side fetcher allows only http and https on ports 80 and 443. It rejects private, loopback, link-local, CGNAT and metadata addresses, checks every redirect hop, and re-checks the address at connect time.
- No credentials, client secrets, tokens or cookies are committed. Screenshots are redacted before commit.
