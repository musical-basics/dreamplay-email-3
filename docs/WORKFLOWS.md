# Workflows

Two reference workflows for future agents.

1. **Campaign send flow** — how an email campaign goes from a master template
   to inboxes, with per-recipient analytics attribution after delivery.
2. **Repo topology** — how the five repos involved relate, what infra they
   share, and where each piece of behavior lives.

---

## 1. Campaign send flow

This is the workflow the Belgium + Masterclass send used. Same pattern works
for any future campaign.

### Source of truth: a master template

Every campaign starts as a master template row in the `campaigns` table:

- `is_template = true`
- `workspace = "musicalbasics"` (or whichever workspace owns it)
- `subject_line`, `html_content`, `variable_values` are the canonical content
- `variable_values` carries:
  - `from_name`, `from_email` (e.g. "Lionel Yu", "lionel@musicalbasics.com")
  - `preview_text`
  - Image vars like `logo_src`, `hero_img`, `secondary_img`, plus their paired
    `_link_url` vars (see [ASSET_LOADING.md](ASSET_LOADING.md))
- The master never carries `subscriber_ids` or `target_tag`. Recipient
  targeting always lives on a child clone.

The master template is stable. You edit it in `/editor`, the dashboard, or
via Hermes PATCH. Everything downstream reads from it.

### Per-batch flow

For each batch you want to send (test or production):

1. **Pick recipients.** Query subscribers, filter to:
   - `workspace = "musicalbasics"` (or whichever)
   - `status = "active"`
   - tags do not include `"Test Account"`
   - tags do not include the campaign's done marker (e.g.
     `"done-belgium-masterclass"`) so re-runs are idempotent

2. **Clone the master into a child** with the recipients baked in:

   ```
   POST https://dreamplay-email-3.vercel.app/api/editor/{workspace}/campaigns/{master_id}/clone
   {
     "subscriber_ids": ["uuid", "uuid", ...],
     "name": "Campaign Name (Marketing batch N, K subs, fires HH:MM EDT)"
   }
   ```

   The child gets `parent_template_id` pointing at the master, copies the
   master's `variable_values` (with `subscriber_id` stripped), copies HTML
   and subject, gets `is_template: false`, gets a fresh id. The clone
   endpoint is documented in [HERMES_API.md](HERMES_API.md).

3. **Schedule the child.** Same Hermes API, send endpoint:

   ```
   POST https://dreamplay-email-3.vercel.app/api/editor/{workspace}/campaigns/{child_id}/send
   {
     "scheduledAt": "2026-05-01T17:11:00Z",
     "fromName":   "Lionel Yu",
     "fromEmail":  "lionel@musicalbasics.com"
   }
   ```

   `scheduledAt` is required for a scheduled send; omit it for an immediate
   send. The Hermes route writes `scheduled_at`, `scheduled_status: "pending"`,
   and `status: "scheduled"` on the child, then dispatches an Inngest event
   named `agent.campaign.scheduled-send` (or `agent.campaign.send` for
   immediate).

4. **Inngest cloud holds the event** via `step.sleepUntil(scheduledAt)` until
   fire time. The function `agent-scheduled-campaign-send` is registered in
   the `dreamplay-email-3-agent` Inngest app
   (`https://dreamplay-email-3.vercel.app/api/inngest`).

5. **At fire time** the Inngest function wakes, re-reads the campaign, bails
   if `scheduled_status = "cancelled"` or `status = "completed"`, then POSTs
   to `https://dreamplay-email-3.vercel.app/api/send-stream` in sync mode.

6. **send-stream does the heavy lifting** ([app/api/send-stream/route.ts](../app/api/send-stream/route.ts)):
   - If the campaign passed in is still a master (`is_template = true`),
     auto-clones again into a tracked child. Belt-and-suspenders.
   - Renders the global mustache pass with `variable_values`.
   - Injects the preheader from `variable_values.preview_text`.
   - Runs `proxyEmailImages` to download every external image, optimize
     with Sharp if over 150KB, and re-host on Supabase Storage so recipient
     inboxes never hit the original CDNs.
   - For each recipient:
     - Computes a per-recipient `unsubscribe_url`
     - Runs `applyAllMergeTagsWithLog` to fill `{{first_name}}`, `{{email}}`,
       `{{unsubscribe_url}}`, etc.
     - Rewrites every `href` to append `sid` (subscriber id) and `cid`
       (campaign id) so destination-side analytics can attribute clicks
     - Injects an open-tracking pixel pointing at `TRACKING_BASE_URL`
       (currently `https://email.dreamplaypianos.com/api/track/open`)
     - Sends via Resend with `from = "<from_name> <from_email>"`
     - Writes a `sent_history` row
   - Marks the child `status: "completed"` and stores the first Resend id.
   - Logs everything to a `send_logs` row for forensic debugging.

7. **Tag the recipients as done.** After scheduling (not waiting for the
   fire), patch each subscriber's `tags` array to include the campaign's
   done marker (e.g. `"done-belgium-masterclass"`). Idempotent: the
   recipient query in step 1 already excludes anyone with this tag.

8. **Update the local tracking CSV.** Path:
   `dreamplay-email-3/_work/belgium-masterclass-recipients.csv`. The CSV is
   gitignored (PII) but lets you audit progress with `cat _work/...csv` or
   open it in any editor. Rows have `status` (`pending` → `done`),
   `scheduled_at`, `child_campaign_id`.

### After delivery: click and open attribution

Each recipient that clicks a link lands on
`belgium.musicalbasics.com/?sid=X&cid=Y` or
`ultimatepianist.com/?sid=X&cid=Y` (or the ticket URL with sid/cid appended).

The `DpAnalyticsBeacon` component on those landing pages fires:

- A `pageview` event on landing
- A `page_leave` event on `pagehide` / `visibilitychange` with
  `metadata.duration_seconds`

Both events POST to `https://data.dreamplaypianos.com/api/track` with
`metadata = { sid, cid, site: "musicalbasics", brand: "belgium-concert",
host, referrer, ...utm_* }`. The analytics endpoint:

1. Looks up the subscriber's email from `metadata.sid` against the email
   Supabase project, injects `metadata.email` if found.
2. Inserts a row into `analytics_logs` with the enriched metadata, the IP
   address, country, user agent.

The analytics dashboard at `data.dreamplaypianos.com` then reads
`analytics_logs` and groups by `(ip, email)` so visits from a single
machine that has been used by multiple email accounts (e.g. personal
gmail and a shared support inbox) show as separate visitor rows.

Open tracking still flows through dp-email-2's `/api/track/open` for now
(Phase 2c will port it to dp-email-3). Click tracking does not redirect
through any tracking endpoint; recipients land on the destination directly
with `sid` and `cid` query params.

### Test sends vs production sends

Test sends to the `Test Account` tagged subscribers (12 across all
workspaces, ported into musicalbasics) are exactly the same flow with a
different recipient list. They never tag with the production done marker,
so the production batches still pick up every active subscriber.

---

## 2. Repo topology

Five active repos and three shared infra services. None of these are
strictly required to run alone; they share one Resend account, one Inngest
project, and two Supabase projects (one for email data, one for analytics).

### Active repos

#### `dreamplay-email-2` — humans
- Hosted at: `email.dreamplaypianos.com`
- Internal admin dashboard for managing campaigns, audiences, chains, etc.
- Hosts the public `/unsubscribe` page and `/api/track/click` and
  `/api/track/open` redirect endpoints.
- Has its own send-stream and Inngest functions. App id in Inngest:
  `musical-basics-engine`.
- Inngest events: `campaign.send`, `campaign.scheduled-send`, `chain.*`.
- Source of truth for the email Supabase schema.

#### `dreamplay-email-3` — agents (this repo)
- Hosted at: `dreamplay-email-3.vercel.app`
- Lean agent-first API. The full Hermes API surface lives here:
  `/api/hermes/{workspace}/campaigns`, `/api/hermes/{workspace}/subscribers`,
  etc. Documented in [HERMES_API.md](HERMES_API.md).
- Has its own send pipeline ported from dp-email-2 with
  brand-namespaced Inngest events (`agent.campaign.send`,
  `agent.campaign.scheduled-send`) so the two apps cannot accidentally
  double-process each other's events. Separate Inngest app id:
  `dreamplay-email-3-agent`.
- Currently routes click/open/unsubscribe URLs through dp-email-2 via the
  `TRACKING_BASE_URL` env var (Phase 2c will move these here too).
- Editor lives at `/editor` for human review of agent-generated drafts.

#### `dreamplay-analytics` — observability
- Hosted at: `data.dreamplaypianos.com`
- Receives beacons via `/api/track`, stores in `analytics_logs` (its own
  Supabase project, distinct from the email Supabase).
- Cross-references the email Supabase via `EMAIL_SUPABASE_URL` env var to
  resolve `metadata.sid` to subscriber email server-side and to enrich
  visitor rows with subscriber tags (purchased state, etc.).
- Dashboard with traffic overview, visitor browsing histories, email
  visitors, A/B test segmentation, raw logs export.
- CORS allowlist accepts:
  - `dreamplaypianos.com` (any subdomain)
  - `belgium.musicalbasics.com`
  - `musicalbasics.com`, `www.musicalbasics.com`
  - `ultimatepianist.com`, `www.ultimatepianist.com`
  - localhost and `*.vercel.app` for previews

#### `belgium-concert-landing-page` — public site
- Hosted at: `belgium.musicalbasics.com`
- Concert ticket landing for the June 11, 2026 Belgium show.
- Has Shopify checkout buttons for in-person tickets and a $5 livestream
  variant.
- Client-side analytics: GA4, Meta Pixel, TikTok Pixel, Vercel Analytics,
  plus the custom `DpAnalyticsBeacon` that posts to dreamplay-analytics
  with `metadata.brand = "belgium-concert"`.

#### `ultimate-pianist-masterclass` — public site
- Hosted at: `ultimatepianist.com`
- Masterclass landing and signup.
- Same `DpAnalyticsBeacon` pattern with `metadata.brand = "ultimate-pianist"`.

### Shared infra

#### Supabase, email project (`quyqwdjygzalqqmrgkfk`)
- Tables: `campaigns`, `subscribers`, `sent_history`, `send_logs`,
  `media_assets`, `email_chains`, `tag_definitions`, `merge_tags`, etc.
- Storage buckets: `email-assets` (campaign images), `email-images`
  (proxied/optimized images at send time).
- Both `dreamplay-email-2` and `dreamplay-email-3` read and write here.
- `dreamplay-analytics` reads here via `EMAIL_SUPABASE_URL` for sid → email
  lookup and subscriber tag cross-reference.

#### Supabase, analytics project (`tqhfpcdqxylrknwbrqqi`)
- Tables: `analytics_logs`, `ip_email_map`, A/B test config, chat sessions.
- Only `dreamplay-analytics` reads/writes here.

#### Resend
- One account. Sends from `lionel@musicalbasics.com`,
  `hello@email.dreamplaypianos.com`, etc., depending on the campaign's
  `from_email`. Domains must be verified in Resend.
- Sends fire from both `dreamplay-email-2` and `dreamplay-email-3`
  send-streams.

#### Inngest
- One account, two registered apps:
  - `musical-basics-engine` (dp-email-2) → listens for `campaign.*` and
    `chain.*` events
  - `dreamplay-email-3-agent` (dp-email-3) → listens for `agent.campaign.*`
    events
- Events from one app never route to the other thanks to the namespace
  separation.

### Cross-repo dependencies

- dp-email-3 → dp-email-2 (HTTP): click/open redirects and unsubscribe page
  via `TRACKING_BASE_URL=https://email.dreamplaypianos.com`. Will be
  removed when Phase 2c ports `/api/track/*` and `/unsubscribe` into
  dp-email-3.
- dp-email-3 + dp-email-2 → email Supabase: shared read/write.
- dreamplay-analytics → email Supabase (read-only): subscriber lookups.
- belgium-concert-landing-page → dreamplay-analytics (HTTP): beacon posts.
- ultimate-pianist-masterclass → dreamplay-analytics (HTTP): beacon posts.
- All five → Resend, Inngest, Vercel as platform deps.

### Where each piece of behavior lives

| Capability | Where |
|---|---|
| Master templates | `campaigns` table in email Supabase |
| Cloning master to child | dp-email-3 `POST /api/hermes/{w}/campaigns/{id}/clone` |
| Scheduling sends | dp-email-3 `POST /api/hermes/{w}/campaigns/{id}/send` (with `scheduledAt`) |
| Image rendering, mustache, merge tags, send loop | dp-email-3 `app/api/send-stream/route.ts` |
| Inngest scheduled-send fire | dp-email-3 `src/inngest/functions/agent-scheduled-send.ts` |
| Click tracking redirect | dp-email-2 `app/api/track/click/route.ts` |
| Open tracking pixel | dp-email-2 `app/api/track/open/route.ts` |
| Unsubscribe page | dp-email-2 `app/unsubscribe/page.tsx` |
| Resend webhook handler | dp-email-2 |
| Public unsubscribe brand-aware homepage redirect | dp-email-2 `app/unsubscribe/page.tsx` (`WORKSPACE_HOME_URLS`) |
| Page-view + session beacon | beacon component in each public site repo |
| Beacon ingestion + sid → email enrichment | dreamplay-analytics `app/api/track/route.ts` |
| Visitor list with per-event email attribution | dreamplay-analytics `app/api/stats-v2/route.ts` |
| Email-attributed visitor history | dreamplay-analytics `app/api/email-visitors/route.ts` |

---

## Quick reference

**To send a new campaign batch:**

1. Read the master template id (e.g. Belgium + Masterclass:
   `b04a217d-7855-447e-9b29-fa25b50802a0`)
2. Query qualified subscribers (active, no Test Account, no done marker)
3. Clone with `subscriber_ids` set
4. Schedule the child with `scheduledAt`
5. Tag each recipient as done in DB
6. Update local CSV at `dreamplay-email-3/_work/...csv`

**To debug a failed send:**

1. `select * from send_logs where campaign_id = '<child_id>'` for raw logs.
2. Check the `dreamplay-email-3-agent` app on
   [app.inngest.com](https://app.inngest.com/) for the Inngest function
   run history.
3. Check Resend dashboard for individual delivery status.

**To verify analytics is recording clicks:**

```sql
select created_at, metadata->>'email' as email,
       metadata->>'brand' as brand, path, ip_address
from analytics_logs
where metadata->>'cid' = '<child_id>'
order by created_at desc;
```

(Run against the analytics Supabase, not the email one.)
