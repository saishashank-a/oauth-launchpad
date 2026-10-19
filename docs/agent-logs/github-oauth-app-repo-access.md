# Agent log: github-oauth-app-repo-access (2026-10-20)

## Sources fetched (all docs.github.com, all 200)
- /apps/oauth-apps/building-oauth-apps/creating-an-oauth-app
- /apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- /apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- /apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
- /apps/oauth-apps/building-oauth-apps/best-practices-for-creating-an-oauth-app
- /rest/using-the-rest-api/rate-limits-for-the-rest-api
- /organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions
- /organizations/managing-oauth-access-to-your-organizations-data/approving-oauth-apps-for-your-organization
- /account-and-profile/.../requesting-organization-approval-for-oauth-apps
- /apps/oauth-apps/maintaining-oauth-apps/transferring-ownership-of-an-oauth-app
- /apps/github-marketplace/github-marketplace-overview/about-github-marketplace-for-apps
- /apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app
- /enterprise-cloud@latest/admin/managing-iam/.../abilities-and-restrictions-of-managed-user-accounts

## What was automated
All research via WebFetch; JSON written and validated with scripts/validate.ts. No setup performed (no firsthand_test claims).

## Failures / gaps
- No 404s or paywalls. WebSearch not needed.
- WebFetch summarizer truncates quotes to ~125 chars; excerpts are stitched short verbatim fragments.
- Did not fetch refreshing-user-access-tokens page separately (expiry figures taken from authorizing + best-practices pages).

## Uncertain
- "No review" is inferred from absence of any review step in docs (c2 partially_supported, c20 inference).
- EMU users' ability to *authorize* third-party OAuth Apps not confirmed.
- Org-owner approval and Marketplace verification have no published turnaround.
