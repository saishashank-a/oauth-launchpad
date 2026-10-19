# OAuth Launchpad — build plan & contracts (owner: main session)

Stack: Next.js 16 (app router, TS, Tailwind 4), zod, postgres (Supabase), @anthropic-ai/sdk. Deploy: Vercel.
Guides: curated JSON in data/guides/*.json (seeded into DB by scripts/seed.ts); generated guides persisted in DB. Both share lib/schema.ts `Guide`.

## Contracts
- lib/schema.ts — Guide zod schema + validateGuide() + coverage(). Do not change shape without updating curated JSON.
- lib/db.ts — ensureSchema(), saveGuide(), getGuide(slug), listGuides(), slugExists(). DATABASE_URL env.
- POST /api/generate  body {query: string} → `application/x-ndjson` stream, one JSON per line:
  {type:"progress", stage:"identify"|"search"|"fetch"|"extract"|"validate"|"save", message:string}
  {type:"candidates", candidates:[{name, website, reason}]}   // ambiguous input → stop here, client lets user pick, re-POSTs with {query, website}
  {type:"done", slug, url}
  {type:"error", code:"missing_config"|"rate_limited"|"timeout"|"malformed_output"|"insufficient_evidence"|"bad_input"|"upstream", message}
- components/GenerateForm.tsx — client component (owned by research agent), used by app/page.tsx.
- Guide URL: /g/[slug]. Library: /. Docs: /notes (setup notes), /audit (fact-check), /agent-log. Those render markdown from docs/*.md at build time.

## Env (.env.example)
DATABASE_URL, ANTHROPIC_API_KEY, TAVILY_API_KEY, GENERATE_RATE_LIMIT_PER_HOUR (default 5), NEXT_PUBLIC_SITE_URL.
