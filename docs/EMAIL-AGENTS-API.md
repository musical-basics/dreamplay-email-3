# Email Agents API

Base URL:

```text
/api/agent/{workspace}/{resource}
```

Every request needs:

```http
Authorization: Bearer <AGENT_API_KEY>
```

All list endpoints support:

| Param | Default | Notes |
| --- | --- | --- |
| `limit` | `25` | Max `500` |
| `offset` | `0` | Zero-based row offset |

Responses use an envelope:

```json
{
  "data": [],
  "pagination": { "limit": 25, "offset": 0, "count": 0 }
}
```

## Resources

- `GET /campaigns`
- `GET /campaigns/{id}`
- `POST /campaigns`
- `PATCH /campaigns/{id}`
- `POST /campaigns/{id}/clone`
- `POST /campaigns/{id}/send`
- `GET /campaigns/{id}/analytics`
- `GET /campaigns/{id}/sent-history`
- `GET /campaigns/{id}/events?type=open|click&filter=raw|human`
- `GET /subscribers` — supports `?tag=X`, `?not_tag=X` (repeatable), `?status=`, `?search=`
- `GET /subscribers/{id}`
- `GET /subscribers/{id}/history`
- `POST /subscribers`
- `PATCH /subscribers/{id}`
- `POST /subscribers/bulk-tag`
- `POST /subscribers/bulk-untag`
- `GET /tags`
- `POST /tags`
- `DELETE /tags/{id}`
- `GET /chains`
- `GET /chains/{id}`
- `POST /chains`
- `POST /chains/{id}/activate`
- `POST /chains/{id}/deactivate`
- `GET /rotations`
- `GET /rotations/{id}`
- `GET /rotations/{id}/analytics`
- `POST /rotations`
- `PATCH /rotations/{id}`
- `POST /rotations/{id}/send`
- `GET /merge-tags`
- `GET /triggers`
- `POST /triggers`
- `POST /copilot`

## Campaign Fields

When creating a campaign with `POST /campaigns`, agents should be aware of these fields. Required: `name`. The rest are optional but most have specific allowed values.

### `email_type`

Allowed values: `"campaign"` or `"automated"`. Defaults to `"campaign"` if omitted.

- `"campaign"`: a regular broadcast or newsletter, manually composed and sent (or scheduled). **This is what the Engine UI's Drafts/Scheduled/Completed tabs filter on**, so a campaign with any other value will not appear in those tabs.
- `"automated"`: a campaign sent by a chain or trigger as part of an automated flow. Use this only when the campaign is wired to fire from a chain step or trigger, not from a manual send.

Do not invent values like `"broadcast"`, `"newsletter"`, or `"transactional"`. Validation will reject them.

### `status`

Allowed values: `"draft"`, `"scheduled"`, `"sending"`, `"completed"`, `"deleted"`. New campaigns should be created with `status: "draft"` (or omitted, since draft is the conventional starting state). The send dispatcher transitions this field; agents should not set `"sending"` or `"completed"` directly.

### `is_template` and `parent_template_id`

- `is_template: true` marks the row as a master template that other campaigns can be cloned from. Templates appear in the Engine UI's Master Templates tab and are excluded from Drafts.
- `parent_template_id` points a regular campaign at the master template it was cloned from. Optional; only set this if the campaign was actually derived from a template.

### `variable_values`

A JSON object of merge-tag values for the campaign. Keys correspond to `{{tokens}}` in `html_content`. Common keys observed in existing templates: `logo_src`, `hero_img`, `hero_link_url`, `secondary_img`, `unsubscribe_url`. The `{{first_name}}` token is populated per-recipient at send time, not from this object.

For the full asset-loading model (image variables, asset library, upload flow, what happens at send time), see [ASSET_LOADING.md](ASSET_LOADING.md).

## Cloning Master Templates

The Agent API refuses to send a campaign with `is_template: true` (master templates are not sendable directly). To send a master template, clone it into a child campaign first via `POST /campaigns/{id}/clone`, then send the child.

The clone endpoint accepts an optional JSON body. All fields are optional:

```json
{
  "name": "string (overrides auto-generated name)",
  "subscriber_ids": ["uuid", "uuid"],
  "target_tag": "string",
  "variable_values": { "...": "merged into the child's variable_values" },
  "is_template": false,
  "is_starred_template": false
}
```

What the child inherits from the master:

- `subject_line`, `html_content`, `workspace`, `email_type` (copied)
- `variable_values` (copied, with `subscriber_id` stripped)
- `parent_template_id` set to the master's id

Then the body's overrides are applied:

- If `subscriber_ids` is provided, it's set on `variable_values.subscriber_ids` and the child's `name` becomes `"{master name} (Bulk Send {date}, N recipients)"` unless `name` was explicitly provided.
- If `target_tag` is provided, it's set on `variable_values.target_tag` and the name becomes `"{master name} (Tag: {tag})"` unless `name` was explicitly provided.
- Anything in `variable_values` is merged on top, overriding inherited values.
- The child is always created with `status: "draft"`, `is_template: false` by default. If you pass `is_template: true`, you're cloning the master into another master, not a sendable child.

The agent flow for sending a master template to a tagged audience:

1. `POST /campaigns/{master_id}/clone` with `{"target_tag": "Test Account"}`. Receive `child_id` in the response.
2. `POST /campaigns/{child_id}/send` with `{"confirmTargetTag": true}`.

The agent flow for sending to a specific subscriber list:

1. `POST /campaigns/{master_id}/clone` with `{"subscriber_ids": [...]}`.
2. `POST /campaigns/{child_id}/send`.

## Batch-send workflow (idempotent, API-only)

The standard pattern for "send the next N subscribers from a large
audience without double-sending" is three calls. No local state, no CSV.

Pick a per-campaign **done marker tag** that's unique to this send
(e.g. `done-belgium-masterclass`). Then:

1. **Pick the next N untargeted subscribers** — combine `not_tag`
   filters to exclude both test accounts and anyone already targeted:

   ```
   GET /subscribers
       ?status=active
       &not_tag=Test%20Account
       &not_tag=done-belgium-masterclass
       &limit=200
   ```

   Returns up to 200 active subscribers in the workspace who have
   neither tag. The envelope's `pagination.count` is the remaining
   total.

2. **Schedule the send** with the ids you just got:

   ```
   POST /rotations/{id}/send
   {
     "subscriberIds": ["...", "..."],
     "scheduledAt": "2026-05-02T15:00:00Z",
     "fromName": "Lionel Yu",
     "fromEmail": "lionel@musicalbasics.com",
     "clickTrackingMode": "redirect"
   }
   ```

   (Or `POST /campaigns/{id}/send` for a single-template send.)

3. **Tag everyone you just scheduled with the done marker** so they're
   excluded from the next pull:

   ```
   POST /subscribers/bulk-tag
   {
     "emails": ["...", "..."],
     "tags": ["done-belgium-masterclass"]
   }
   ```

The flow is naturally idempotent: re-running step 1 returns only
subscribers not yet tagged. To audit progress, hit step 1 again with
`limit=1` and read the `count` — that's how many remain. To audit
already-sent, query with `?tag=done-belgium-masterclass`.

## Click events: scanner filtering

`GET /campaigns/{id}/events?type=click&filter=human` returns the click
events with email-security scanners and link unfurlers excluded. Three
signals are applied in order:

1. **User-Agent blocklist** — the `subscriber_events.user_agent` is
   matched against a list of known scanner UA substrings (Microsoft
   ATP Safe Links, Mimecast, Proofpoint, Slack/Discord/Twitter
   unfurlers, etc.).
2. **Time-from-sent** — events that arrive within 10 seconds of the
   recipient's `sent_history.sent_at` are dropped. Real human clicks
   on marketing email almost never happen that fast; almost all
   sub-10s clicks are automated pre-fetches.
3. **Burst detection** — for each subscriber, consecutive events
   whose gaps are all ≤ 5 seconds form a "session". Sessions with
   4+ events are flagged as scanner walks (humans rarely click 4+
   distinct links in 5 seconds; scanners do, on every email).

The endpoint returns the cleaned set in `data` (paginated) and surfaces
diagnostics in the response envelope:

```json
{
  "data": [...],
  "pagination": { "limit": 25, "offset": 0, "count": 6 },
  "raw_count": 22,
  "excluded": { "scanner_ua": 0, "too_fast": 7, "burst": 11 }
}
```

`filter=raw` (or omitting the param) returns every row, including
scanners. Use `raw` when comparing to historical numbers; use `human`
for actual engagement reads.

The IP + User-Agent capture relies on a one-time Supabase migration
(see `docs/migrations/2026-05-02-subscriber-events-ip-ua.sql`). Until
that is run, `filter=human` falls back to the time-only filter and
returns a `warning` field in the response.

## Click tracking modes

Both `POST /campaigns/{id}/send` and `POST /rotations/{id}/send` accept a
`clickTrackingMode` field in the request body:

- `"append"` (default): each `<a href>` in the email is rewritten to
  include `sid` (subscriber id) and `cid` (campaign id) as query params.
  The recipient lands on the destination immediately. **No click event is
  written** to `subscriber_events`. Click attribution lives only on the
  destination side, via `DpAnalyticsBeacon` posting to
  `analytics_logs` on the analytics Supabase project.

- `"redirect"`: hrefs are first rewritten to include sid/cid, then the
  whole URL is wrapped in `https://email.dreamplaypianos.com/api/track/click?c=<cid>&s=<sid>&u=<encoded URL>`.
  When the recipient clicks, dp-email-2's redirect endpoint inserts a row
  into `subscriber_events` (`type: "click"`, `url: <destination>`), then
  302s the user to the final destination. Destination beacons still see
  sid/cid because they ride through the `u` param.

Use `"redirect"` when you need click counts visible via
`GET /campaigns/{id}/events?type=click` or via the dashboard's
`total_clicks` column. Use `"append"` (default) when destination-side
analytics_logs is sufficient and you'd rather avoid the extra hop.

## Safe Sending

The Agent API refuses to send a campaign unless `variable_values` has one of:

- `subscriber_id`
- non-empty `subscriber_ids`
- `target_tag`

`target_tag` sends are additionally blocked unless the request body includes:

```json
{ "confirmTargetTag": true }
```

Agent workflows should prefer `subscriber_ids`.

## Rotations (A/B sends)

A rotation holds an ordered list of master template campaigns and a
cursor. Each subscriber sent through the rotation is round-robin
assigned to one of the templates, picking up from the cursor and
advancing it. This is the standard A/B testing primitive.

The rotation row stores:

- `name`
- `campaign_ids` (ordered, length = number of variants, typically 2-3)
- `cursor_position` (next variant index to assign)
- `workspace`
- optional `scheduled_at` and `scheduled_status` for scheduled sends

### Creating a rotation

```
POST /rotations
{
  "name": "Belgium A/B test",
  "campaign_ids": ["uuid-template-A", "uuid-template-B"]
}
```

Both campaign ids must already exist in the workspace and should be
master templates (`is_template: true`). The rotation is created with
`cursor_position: 0`.

### Sending a rotation

```
POST /rotations/{id}/send
{
  "subscriberIds": ["uuid", "uuid", ...],
  "fromName": "Lionel Yu",
  "fromEmail": "lionel@musicalbasics.com",
  "scheduledAt": "2026-05-01T18:30:00Z"
}
```

Required: `subscriberIds`. All other fields are optional.

If `scheduledAt` is omitted, the send fires immediately via the
`agent.rotation.send` Inngest event. If `scheduledAt` is set, the
rotation row is marked `scheduled_status: "pending"` and the send is
held until that timestamp via the `agent.rotation.scheduled-send`
Inngest event.

Under the hood, both paths call `/api/send-rotation`, which:

1. Round-robin assigns each subscriber to one of the rotation's
   templates starting from `cursor_position`.
2. For each (template, subscriber batch), inserts a child campaign
   (`parent_template_id` = template, `rotation_id` = rotation) and
   posts to `/api/send-stream` with the batch's subscriber ids. This
   uses the same sid/cid click-tracking append pattern as a normal
   campaign send. Click tracking does **not** redirect through
   `/api/track/click`.
3. Advances `cursor_position` by the total subscribers sent.

### Rotation analytics

```
GET /rotations/{id}/analytics
```

Returns one row per template in `campaign_ids`, aggregating across
every child campaign that was created from this rotation:

```json
{
  "data": [
    {
      "templateId": "uuid",
      "templateName": "Variant A",
      "sends": 100,
      "opens": 26,
      "clicks": 6,
      "openRate": 26,
      "clickRate": 6,
      "childCampaigns": [{ "id": "...", "total_recipients": 100, ... }]
    },
    ...
  ]
}
```

Open and click counts are read from each child's `total_opens` /
`total_clicks` columns, which are written by the open-pixel and
click-attribution paths in dp-email-2. Be aware that `total_clicks` is
only populated for clicks that go through dp-email-2's
`/api/track/click` redirect endpoint. Clicks tracked via sid/cid
append (the default in dp-email-3) land in `subscriber_events` and on
the analytics Supabase project, **not** on `total_clicks`. For the
real click count, query `subscriber_events` filtered to
`type = "click"` and the rotation's child campaign ids, or query the
analytics Supabase project's `analytics_logs` filtered to
`metadata->>'cid'` in the rotation's child campaign ids.
