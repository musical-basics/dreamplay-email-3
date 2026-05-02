# Session Notes — 2026-05-02

Long iteration day across dp-email-2, dp-email-3, dp-analytics, plus the
two landing-page repos. Below is what shipped, what got sent, and what's
deferred. Reference for the next agent session.

---

## API additions / changes (dp-email-3)

### Rotations (new resource)
`POST /api/send-rotation` ported from dp-email-2 with one critical
difference: delegates each per-batch send to dp-email-3's own
`/api/send-stream`, so click tracking uses sid/cid append by default
(no broken-redirect dependency).

Agent API endpoints added in [src/agent/handler.ts](../src/agent/handler.ts):
- `GET /rotations` — list per workspace (paginated)
- `GET /rotations/{id}` — single
- `GET /rotations/{id}/analytics` — per-template aggregates plus child campaigns
- `POST /rotations` — create
- `PATCH /rotations/{id}` — update
- `POST /rotations/{id}/send` — immediate or scheduled (via `scheduledAt`)

Inngest functions: `agent.rotation.send`, `agent.rotation.scheduled-send`
in [src/inngest/functions/](../src/inngest/functions/). Both registered
in [app/api/inngest/route.ts](../app/api/inngest/route.ts).

### Subscriber filtering
- `GET /subscribers?not_tag=X` — repeatable; excludes any subscriber that
  has tag X. Lets agents pick "next N untargeted" without local state.
- `POST /subscribers/bulk-untag` — mirror of `bulk-tag`, removes tags from
  a list of emails.

### Click events
- `GET /campaigns/{id}/events?type=open|click&filter=raw|human` — paginated
  subscriber_events. `filter=human` applies three signals to exclude
  scanners: UA blocklist, time-from-sent < 10s, and per-subscriber burst
  detection (≥4 events whose consecutive gaps are ≤5s).
- Raw select includes `ip_address` and `user_agent` (was missing before;
  surfaced as undefined in earlier responses).

### Pagination
- Cap raised from 100 to 500 in [src/lib/pagination.ts](../src/lib/pagination.ts).
- Subscribers list ordering changed `updated_at` → `created_at` (the column
  doesn't exist on `subscribers`).

### Send pipeline flags
- `clickTrackingMode: "append" | "redirect"` (default `"append"`) plumbed
  end-to-end through `/api/send-stream`, `/api/send-rotation`, the
  Inngest functions, and the Agent API send endpoints.
- Per-brand tracking host picker: `pickTrackingBaseUrl(fromEmail)` in
  [app/api/send-stream/route.ts](../app/api/send-stream/route.ts) maps
  the From domain to a brand-aligned tracking subdomain.

### Naming
- URL prefix `/api/hermes/` → `/api/agent/`
- Env var `HERMES_API_KEY` → `AGENT_API_KEY`
- Files `src/hermes/*` → `src/agent/*`
- Symbols `handleHermesRequest` → `handleAgentRequest`,
  `HermesRouteContext` → `AgentRouteContext`,
  `requireHermesAuth` → `requireAgentAuth`
- Doc `HERMES_API.md` → `EMAIL-AGENTS-API.md`

---

## API additions / changes (dp-email-2)

[app/api/track/click/route.ts](../../dreamplay-email-2/app/api/track/click/route.ts):

- Whitelist extended: `musicalbasics.com`, `ultimatepianist.com`
  (and any subdomain of either). Previously only `dreamplaypianos.com`,
  YouTube, IG.
- sid/cid auto-injection extended to those domains.
- Captures `x-forwarded-for` (IP) and `user-agent` on every click row.
  Defensive insert: tries the new shape first; falls back to the
  original 4-column insert if the columns don't exist yet.

---

## Database migration

Run once in Supabase SQL editor for the email project
(`quyqwdjygzalqqmrgkfk`):

```sql
ALTER TABLE subscriber_events
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;
```

Already run in this session. Source: [docs/migrations/2026-05-02-subscriber-events-ip-ua.sql](migrations/2026-05-02-subscriber-events-ip-ua.sql).

---

## Per-brand tracking domains

DNS records added at the registrars (Google Cloud DNS for
musicalbasics.com, equivalent for ultimatepianist.com):

| Host | Type | Target |
|---|---|---|
| `link.musicalbasics.com` | CNAME | `cname.vercel-dns.com.` (resolves to project-specific Vercel target) |
| `link.ultimatepianist.com` | CNAME | same |

Both added as custom domains on the **dreamplay-email** Vercel project
(connected to dp-email-2 GitHub repo, deployed at
`email.dreamplaypianos.com`). All three hosts (the two `link.*` aliases
plus `email.dreamplaypianos.com` itself) point at the same Vercel app
and serve the same `/api/track/click` and `/api/track/open` endpoints.

The `pickTrackingBaseUrl` map in send-stream:

| From domain | Tracking base |
|---|---|
| `musicalbasics.com` | `https://link.musicalbasics.com` |
| `ultimatepianist.com` | `https://link.ultimatepianist.com` |
| `dreamplaypianos.com` / `email.dreamplaypianos.com` | `https://email.dreamplaypianos.com` |
| anything else | `TRACKING_BASE_URL` env var, fallback `email.dreamplaypianos.com` |

Phishing-flag fix: emails From `lionel@musicalbasics.com` now have all
visible tracking links on `link.musicalbasics.com`, eliminating
sender/link-domain mismatch.

---

## Master template edits (musicalbasics workspace)

All applied via Agent API `PATCH /campaigns/{id}` with `html_content`.

**Variant A — combined Belgium + Masterclass (`b04a217d-...`)**:
- Footer: "Musical Basics" → "MusicalBasics".
- Livestream callout: "Can't make it in person? You can watch the
  livestream for $5 (normally $15)" → "Can't make it in person?
  Virtual tickets are also available on the same page."

**Variant B — Belgium-only focused (`db10a687-...`)**:
- Subject: "Belgium, June 11. Tickets are live." → "My Upcoming
  Concert In Belgium".
- Footer: "Musical Basics" → "MusicalBasics".
- Intro: "Classical piano with EDM, reimagined for the stage. If you
  already know my music, you already know the spirit of what this
  night will be." → "I'm proud to announce my upcoming concert in
  Belgium. Classical piano with EDM, reimagined for the stage."
- New testimonial block inserted after the livestream callout:
  > "My best concert. EVER. The sound… well you had to be there to
  > experience it, from this incredible venue."  — CASSANDRA S.
- Livestream callout: same swap as A.

---

## Sends executed (musicalbasics workspace)

| Time (UTC) | Pipeline | Recipients | Mode | Notes |
|---|---|---|---|---|
| 2026-05-01 20:41 | dp-email-2 send-rotation | 200 (100/100) | redirect | Original A/B test. Click data only valid on this batch. |
| 2026-05-02 01:01 | dp-email-3 /api/send-rotation | 12 test | append | First dp-email-3 rotation. |
| 2026-05-02 03:07 | dp-email-3 (Inngest scheduled) | 12 test | append | Verified scheduled-send pipeline. |
| 2026-05-02 03:18 | dp-email-3 (immediate) | 8 test | append | After deactivating 4 test accounts. |
| 2026-05-02 03:27 | dp-email-3 (Inngest scheduled) | 100 prod | append | Production batch 1. |
| 2026-05-02 03:54 | dp-email-3 (Inngest scheduled) | 100 prod | append | Production batch 2. |
| 2026-05-02 13:58 | dp-email-3 (Inngest scheduled) | 8 test | redirect | First redirect-mode test. clickTrackingMode flag verified. |
| 2026-05-02 14:00 | dp-email-3 (immediate, single template) | 8 test | redirect | Variant A only, redirect mode. |
| 2026-05-02 14:28 | dp-email-3 (Inngest scheduled) | 200 prod | redirect | First redirect-mode prod batch. Used `email.dreamplaypianos.com` (pre-tracking-domain). |
| 2026-05-02 21:03 | dp-email-3 (immediate) | 8 test | redirect | First send through `link.musicalbasics.com`. User-verified inbox. |
| 2026-05-02 21:13 | dp-email-3 (Inngest scheduled) | 100 prod | redirect | First prod batch through `link.musicalbasics.com`. |
| 2026-05-02 21:14 | dp-email-3 (Inngest scheduled) | 100 prod | redirect | Second half (API pagination cap was 100). |

Total prod sends in session: 700 (200 + 100 + 100 + 200 + 100 + 100).

Recipients tagged with `done-belgium-masterclass` so far: ~700.
Remaining qualified pool: ~5,069 (from initial ~5,769).

---

## Test account hygiene

Initial test pool in `musicalbasics`: 12 (ported from dreamplay_marketing
+ dreamplay_support).

Deactivated mid-session via Agent API (`bulk-untag` then PATCH status):
- hello@5ave.studio
- anastasiabelik184@gmail.com
- ana.tgi.dev@gmail.com
- ilin.s.chung@gmail.com

Active test pool now: 8.

---

## Cross-repo work (other repos)

### dp-email-2
- `/api/track/click`: whitelist + IP/UA capture (above).
- (No other dp-email-2 changes this session.)

### dreamplay-analytics
No code changes this session. Architecture unchanged from prior session
(beacons → /api/track → analytics_logs).

### belgium-concert-landing-page, ultimate-pianist-masterclass
No code changes this session.

---

## Documentation updated

- [docs/EMAIL-AGENTS-API.md](EMAIL-AGENTS-API.md) — full Agent API reference.
  New sections: rotations, batch-send workflow (idempotent, API-only),
  click tracking modes, scanner filtering.
- [docs/WORKFLOWS.md](WORKFLOWS.md) — A/B rotation send section, capability
  table updated, references renamed Hermes → Agent API throughout.
- [docs/ASSET_LOADING.md](ASSET_LOADING.md) — URL paths updated.
- [README.md](../README.md) — paths and env var renamed.

---

## Outstanding / deferred

### Phase 2c.1 — port click/open to dp-email-3
The two endpoints (`/api/track/click`, `/api/track/open`) still live on
dp-email-2. Same Supabase, same logic, but cross-repo coupling. When this
is ported:
- Move `link.musicalbasics.com` and `link.ultimatepianist.com` Vercel
  custom domains from `dreamplay-email` project to the dp-email-3 project.
- Move `email.dreamplaypianos.com` similarly (or leave on dp-email-2 with
  dp-email-3 as the new canonical for fresh sends).
- Drop `TRACKING_BASE_URL` env fallback in dp-email-3 send-stream.
- Update [docs/WORKFLOWS.md](WORKFLOWS.md) to reflect.

### Phase 2c.2 — port unsubscribe to dp-email-3
Bigger lift than the API endpoints because it's a public Next.js page
with form + brand-aware home URL routing + DB write. Deferred.

### Architectural question
Splitting dp-email-2 (humans/dashboard) and dp-email-3 (agents) was the
original design. Now that all sends run through dp-email-3 and the
human dashboard rarely changes, the question is whether dp-email-2
should be sunset or scoped to "just the dashboard UI" with everything
else (including click/open/unsubscribe) in dp-email-3. Open question for
later.

### Stale Google 8.8.8.8 DNS cache
At session end, Google's `8.8.8.8` resolver was still returning the
old (Shopify-mangled) CNAME for `link.musicalbasics.com`. Authoritative
and Cloudflare were correct. Resolved on its own as TTL expired; no
remediation needed.

### Sender reputation watch
After the redirect-mode + per-brand-tracking-domain sends, monitor for:
- Open rate trends vs prior batches (check via per-rotation analytics)
- Spam complaints in Resend dashboard
- Any provider-specific bounces

---

## Useful commits this session

| Repo | Hash | Summary |
|---|---|---|
| dp-email-3 | 280fa3c | feat(rotations): own rotation pipeline + rename Hermes doc |
| dp-email-3 | d75978a | refactor: rename hermes → agent across URLs/env/code |
| dp-email-3 | 4610040 | fix(agent-api): drop subscribers.updated_at usage |
| dp-email-3 | 408f63b | feat(agent-api): POST /subscribers/bulk-untag |
| dp-email-3 | b722460 | feat(agent-api): GET /campaigns/{id}/events |
| dp-email-3 | a946f2f | fix(agent-api): correct subscriber_events column names |
| dp-email-3 | af883e7 | feat(send): clickTrackingMode "append" \| "redirect" |
| dp-email-3 | 8f64907 | feat(agent-api): filter=human on events |
| dp-email-3 | 04ae3ad | tweak: too_fast threshold 30s → 10s |
| dp-email-3 | 5dad27e | feat(agent-api): burst-detection scanner filter |
| dp-email-3 | 8dc8ed6 | fix(agent-api): include ip/ua in raw events response |
| dp-email-3 | ff47dc3 | feat(agent-api): not_tag filter + batch-send doc |
| dp-email-3 | a7954b0 | feat(send): per-brand tracking host based on From domain |
| dp-email-3 | 2f4a889 | tweak: list pagination cap 100 → 500 |
| dp-email-2 | 58a0593 | fix(track/click): allow musicalbasics + ultimatepianist |
| dp-email-2 | aaea2c6 | feat(track/click): capture IP + User-Agent |
| dp-email-2 | 9f18162 | chore(track/click): drop debug headers |

---

## Quick reference for the next session

**To send the next batch through the Belgium/Masterclass rotation:**
```bash
KEY=$(grep -E '^AGENT_API_KEY=' .env.local | cut -d= -f2-)
# Get next 200 untargeted
curl "https://dreamplay-email-3.vercel.app/api/agent/musicalbasics/subscribers?status=active&not_tag=Test%20Account&not_tag=done-belgium-masterclass&limit=200" -H "Authorization: Bearer $KEY"
# Then POST /rotations/dc3e09b3-7bfa-440c-a4cf-31e0f9afadb5/send with clickTrackingMode=redirect
# Then POST /subscribers/bulk-tag with done-belgium-masterclass
```

Or run [`_work/run-batch-via-api.ts`](../_work/run-batch-via-api.ts) which
encapsulates the three API calls.

**To check stats on a rotation child:**
```
GET /api/agent/musicalbasics/campaigns/{child-id}/events?type=click&filter=human
```

**To check per-template aggregates across all rotation children:**
```
GET /api/agent/musicalbasics/rotations/dc3e09b3-7bfa-440c-a4cf-31e0f9afadb5/analytics
```
