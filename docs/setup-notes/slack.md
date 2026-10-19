# Slack: app for a workspace agent

- **Guide:** [slack-app-workspace-agent](/g/slack-app-workspace-agent)
- **Date:** 2026-10-20
- **Status: pending. Blocked at sign-in.**

## Attempt 1

| Started (UTC) | Stopped (UTC) |
|---|---|
| 2026-10-19T20:00:39Z | 2026-10-19T20:00:50Z |

1. Opened https://api.slack.com/apps in the user's Chrome.
2. The page said: "You'll need to sign in to your Slack account to create an application."
3. Stopped. Signing in to Slack is a human step, and no Slack session existed in the browser.

Nothing about Slack's setup is proven by this attempt. Every Slack claim in the guide rests on documentation only.

## Manual checklist (pending)
- [ ] Sign in to a Slack workspace you own, or create a free one. Human step.
- [ ] Open https://api.slack.com/apps, click "Create New App", choose "From scratch". Record the fields asked for.
- [ ] In OAuth & Permissions, add bot scopes `channels:read`, `channels:history`, `chat:write`, `users:read`.
- [ ] Add redirect URL `https://localhost:3000/api/auth/callback/slack`. Record whether plain `http://localhost` is rejected.
- [ ] Click "Install to Workspace" for your own workspace. Record the consent screen.
- [ ] Open "Manage Distribution". Record each checklist item Slack requires before "Activate Public Distribution" is enabled. Note whether any review step appears.
- [ ] Call `conversations.history` with the bot token on a test channel. Record rate-limit headers.
- [ ] Delete the app afterwards: Basic Information, Delete App.
