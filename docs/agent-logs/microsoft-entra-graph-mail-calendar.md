# Agent log: microsoft-entra-graph-mail-calendar (2026-10-20)

## Sources fetched (WebFetch, live)
- https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app
- https://learn.microsoft.com/en-us/entra/identity-platform/reply-url
- https://learn.microsoft.com/en-us/entra/identity-platform/supported-accounts-validation
- https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview
- https://learn.microsoft.com/en-us/entra/identity-platform/scopes-oidc
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-admin-consent
- https://learn.microsoft.com/en-us/entra/identity-platform/configurable-token-lifetimes
- https://learn.microsoft.com/en-us/entra/identity-platform/application-consent-experience
- https://learn.microsoft.com/en-us/entra/identity-platform/publisher-verification-overview
- https://learn.microsoft.com/en-us/entra/identity-platform/mark-app-as-publisher-verified
- https://learn.microsoft.com/en-us/entra/identity-platform/troubleshoot-publisher-verification
- https://learn.microsoft.com/en-us/entra/identity-platform/howto-configure-publisher-domain
- https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-branding-in-apps
- https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-user-consent
- https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/user-admin-consent-overview
- https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-admin-consent-workflow
- https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/configure-risk-based-step-up-consent
- https://learn.microsoft.com/en-us/entra/external-id/tenant-restrictions-v2
- https://learn.microsoft.com/en-us/microsoft-365-app-certification/docs/attestation
- https://learn.microsoft.com/en-us/microsoft-365-app-certification/docs/certification
- https://learn.microsoft.com/en-us/graph/permissions-reference (578K chars; fetched in offset chunks for Calendars.ReadWrite, Mail.Read, Mail.Send; User.Read row came from the Microsoft Learn MCP `microsoft_docs_search` because the WebFetch chunk around offset 490K–545K returned garbled table text)

## What was automated
All research, JSON authoring and validation. No portal setup was performed (no firsthand_test claims).

## Failures / gaps
- permissions-reference WebFetch chunks at offsets 490000 and 545000 returned unusable CSV-like fragments; worked around via MCP search (same official page).
- configure-user-consent page came back partially compressed; the built-in option list was taken from user-admin-consent-overview instead.
- No page states the default user-consent setting for new tenants or Partner Center vetting duration.

## Uncertain
- Default tenant user-consent setting (c30, unverified).
- Partner Center business-verification wait (c31, unverified); the only published figures are "verified in minutes" / "may take a few minutes" for the verification step itself.
- Whether tiny startups without a formal legal entity can pass Partner Center vetting.
