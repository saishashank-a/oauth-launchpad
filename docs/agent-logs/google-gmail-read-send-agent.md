# google-gmail-read-send-agent — agent log (2026-10-20)

## Sources fetched (WebFetch)
- https://developers.google.com/workspace/gmail/api/auth/scopes — readonly/modify restricted, send sensitive; server store/transmit triggers assessment
- https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification — CASA, 12-month LOA recert, demo video, exemptions, "several weeks"
- https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification — 3-5 business days, branding before data-access review
- https://support.google.com/cloud/answer/13463817 — FAQ: 10 business days / 6 weeks / 2-3 days; no Google fee; annual full re-test; lifetime 100-user cap
- https://support.google.com/cloud/answer/13464321 — requirements: Search Console, privacy policy, video, Limited Use, narrowest scope
- https://support.google.com/cloud/answer/13464323 — not-needed cases (internal, personal, testing)
- https://support.google.com/cloud/answer/15549945 — Testing 100 users, 7-day expiry, test-user warning, identity exception
- https://support.google.com/cloud/answer/7454865 — unverified app screen
- https://support.google.com/cloud/answer/13465431 — CASA AL1/AL2, yearly revalidation (fetch text degraded)
- https://support.google.com/cloud/answer/9110914 — verification overview
- https://developers.google.com/terms/api-services-user-data-policy — Limited Use (fetch text degraded; quotes taken from 13464321 instead)
- https://developers.google.com/workspace/workspace-api-user-data-developer-policy — AI training ban, internal-org exemption
- https://developers.google.com/identity/protocols/oauth2#expiration — 7-day refresh tokens in Testing

## Failed
- WebSearch for CASA pricing returned 502; no cost figure used.

## Automated
- All research and JSON authoring; validated with scripts/validate.ts (OK, 29 claims). No console setup performed; no firsthand claims.

## Uncertain
- CASA assessor fee (Google publishes none; only "Google does not charge").
- Sensitive verification time conflicts (10 vs 3-5 business days); CASA duration unpublished.
- Restricted scopes for test users: docs describe a warning only; not tested.
- Whether readonly+send+modify together survives narrowest-scope review.
