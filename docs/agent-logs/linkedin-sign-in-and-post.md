# Agent log: linkedin-sign-in-and-post (2026-10-20)

No prior file from the cancelled attempt existed; written fresh. Validator: OK (26 claims).

## Sources fetched (WebFetch)
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access (only tables came through)
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens
- https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits
- https://learn.microsoft.com/en-us/linkedin/shared/api-guide/best-practices/application-development
- https://learn.microsoft.com/en-us/linkedin/marketing/versioning
- https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review
- https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- https://learn.microsoft.com/en-us/linkedin/marketing/quick-start
- https://learn.microsoft.com/en-us/linkedin/marketing/integrations/migrations
- https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases
- https://learn.microsoft.com/en-us/linkedin/consumer/
- https://www.linkedin.com/help/linkedin/answer/a548360 (associate app with Page)
- https://www.linkedin.com/help/linkedin/answer/a1667239 (create developer app)
- https://www.linkedin.com/legal/l/api-terms-of-use

## What failed
- WebSearch returned 502 (gateway error); everything came from direct URLs.
- Raw GitHub markdown (MicrosoftDocs/linkedin-api-docs) was unreachable from the sandbox.
- Fetch output had stopwords stripped / was summarized. Bracketed words in excerpts are restorations, not quotes. API Terms wording came through a fetch that limits quotes to 125 chars.
- https://www.linkedin.com/help/linkedin/answer/a1342443 turned out to be an unrelated ads-settings article.

## Key findings
- An app needs a LinkedIn Page; super admin approves within 30 days; association is permanent.
- profile/email come from OIDC product; w_member_social from Share on LinkedIn (also listed under the gated CM/Advertising APIs).
- Posting endpoint is marked conflicting: Share page says /v2/ugcPosts, Posts API says it replaces ugcPosts.
- 60-day access tokens; refresh tokens only for limited partners.
- API Terms 3.1: no using APIs to "automate posting". This drives the per-post human confirm design.

## Still uncertain
- Whether self-serve products are granted instantly and have no member cap (claim c25 unverified).
- Whether /rest/posts works for a Share-only app; whether localhost redirects are allowed.
- How "automate posting" applies to user-confirmed agent drafts.
