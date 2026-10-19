# Resume checklist (written 2026-10-20 when API session limit hit; resets 05:00 Asia/Calcutta)

Done:
- Next.js scaffold, lib/schema.ts (Guide zod + validateGuide), lib/db.ts (Supabase Postgres, project ref baxfcjmgjuezzdxfypgf, DATABASE_URL in .env.local, connection tested OK), scripts/validate.ts, docs/research-brief.md, docs/PLAN.md (API + page contracts).
- Curated guides researched by agents: github-oauth-app-repo-access, google-sign-in-basic-profile, microsoft-entra-graph-mail-calendar (check validate output; google/microsoft agents were cut off mid-write — re-validate and fix).

Not done (agents killed by session limit):
- Slack, Gmail restricted, LinkedIn guides (re-dispatch with docs/research-brief.md prompts).
- Backend: lib/safeFetch.ts, lib/search.ts (Tavily), lib/llm.ts, lib/research.ts, lib/ratelimit.ts, app/api/generate/route.ts, components/GenerateForm.tsx, scripts/seed.ts, .env.example — spec in the Opus agent prompt / docs/PLAN.md.
- UI: app/page.tsx library, app/g/[slug], /notes /audit /agent-log pages.
- Firsthand setup attempt (GitHub OAuth App via Chrome — tab was opened at github.com/settings/developers, nothing attempted yet), fact-check audit (docs/FACT-CHECK.md), agent log (docs/AGENT-LOG.md), README, deploy.

Blocked on user:
- `vercel login` (token expired), ANTHROPIC_API_KEY, TAVILY_API_KEY (no keys found on machine).
