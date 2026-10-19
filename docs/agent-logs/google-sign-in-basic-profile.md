# google-sign-in-basic-profile — agent log (2026-10-20)

## Sources fetched (WebFetch)
- https://support.google.com/cloud/answer/15549945 — Manage App Audience (user type, Testing/In production, 100 test users, 7-day expiry, identity-scope exception)
- https://support.google.com/cloud/answer/10311615 — Manage OAuth App Branding (logo triggers verification, domain-only display without it)
- https://support.google.com/cloud/answer/9110914 — Verification overview (non-sensitive-only not mandatory; brand-verification)
- https://support.google.com/cloud/answer/13464321 — Verification requirements (homepage, privacy policy, Search Console)
- https://support.google.com/cloud/answer/13464323 — When verification is not needed
- https://support.google.com/cloud/answer/13463817 — Verification FAQ (published timelines, lifetime 100-user cap)
- https://support.google.com/cloud/answer/13461325 — Submitting for verification
- https://support.google.com/cloud/answer/7454865 — Unverified apps
- https://support.google.com/cloud/answer/6158849 — Setting up OAuth 2.0 (Create client, redirect URI rules, propagation delay)
- https://developers.google.com/identity/protocols/oauth2/web-server — redirect URI validation rules
- https://developers.google.com/identity/protocols/oauth2/openid-connect — scope ordering, ID token claims
- https://developers.google.com/identity/protocols/oauth2/scopes — scope consent strings
- https://developers.google.com/identity/protocols/oauth2/policies — HTTPS/domain ownership policy
- https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification — criteria, timelines, exemptions
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification — Gmail/CASA pointer
- https://developers.google.com/identity/protocols/oauth2#expiration — 7-day Testing refresh token rule

## Failed
- 404: /identity/protocols/oauth2/production-readiness/setting-up-oauth
- 404: /identity/protocols/oauth2/resources/oauth-restrictions
- WebFetch summarizer truncates quotes at ~125 chars; excerpts were assembled from multiple confirmed fragments of the same page (joined with "...").

## What was automated
All research via WebFetch; no console setup performed (no firsthand_test claims). 22 claims: 21 supported, 1 partially_supported (c22). First write used non-schema field names; remapped to lib/schema.ts and revalidated OK.

## Uncertain
- Whether an identity-only app can sit in Testing forever with zero user cap; Google exempts it from the test list/warning/7-day expiry but never literally says "no cap". Recommend publishing anyway.
- Console UI specifics (which scope strings are pre-filled, Verify Branding button placement) not visually inspected.
- Workspace-admin third-party-app restrictions for identity-only sign-in only skimmed.
