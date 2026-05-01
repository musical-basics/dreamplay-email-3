# DreamPlay Email 3

API-first DreamPlay email service for agent endpoint use, with one thin `/editor`
page for human review.

This repo intentionally avoids the full dashboard/editor surface from
`dreamplay-email-2`. It keeps the pieces agents need:

- `/api/agent/{workspace}/...` for campaign, subscriber, tag, chain, rotation,
  trigger, merge-tag, copilot, and send-dispatch operations. Documented in
  [docs/EMAIL-AGENTS-API.md](docs/EMAIL-AGENTS-API.md).
- `/editor` for loading a campaign, reviewing rendered HTML, and saving edits.
- strict workspace validation and request schemas.
- paginated list endpoints by default.

## Run Locally

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Then open:

```text
http://localhost:3002/editor
```

## API Auth

Email Agents API endpoints require:

```http
Authorization: Bearer <AGENT_API_KEY>
```

## Workspaces

Allowed slugs:

- `dreamplay_marketing`
- `dreamplay_support`
- `musicalbasics`
- `crossover`
- `concert_marketing`

## Send Dispatch

`POST /api/agent/{workspace}/campaigns/{id}/send` validates the campaign and
recipient targeting, then dispatches an Inngest event. Set `INNGEST_EVENT_KEY`
for this to work.

The actual delivery pipeline can remain in `dreamplay-email-2` while this repo
acts as the lean, agent-safe control plane.
