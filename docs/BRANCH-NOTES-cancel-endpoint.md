# Branch notes — `feat/cancel-endpoint`

Branch off `main` to add agent-API endpoints for cancelling and
re-activating scheduled sends without direct DB access. Spawned out of
the 2026-05-02 incident where 10 overnight scheduled batches needed to
be paused (and then restored) and the only path was a direct Supabase
update.

This branch is intentionally **not merged into main** so production
stays on a known-good build until the user is ready to roll forward.

---

## Endpoints added

All four are routed through the existing
[handleCampaigns](../src/agent/handler.ts) function in
`src/agent/handler.ts`. None of them dispatch new Inngest events; they
only flip the `campaigns.scheduled_status` field that the existing
scheduled-send Inngest functions already inspect on wake.

### `POST /campaigns/{id}/cancel`
Sets `scheduled_status: "cancelled"` on a single campaign. Returns
`{ id, status, scheduled_status, scheduled_at }`.

The corresponding Inngest scheduled-send function (see
[src/inngest/functions/agent-scheduled-send.ts](../src/inngest/functions/agent-scheduled-send.ts)
and [src/inngest/functions/agent-rotation-scheduled-send.ts](../src/inngest/functions/agent-rotation-scheduled-send.ts))
already has the bail check at the top:
```ts
if (campaign.scheduled_status === "cancelled") {
  return { message: "Schedule was cancelled", campaignId };
}
```
So flipping the field is enough — when Inngest wakes the function at
`scheduled_at`, the function returns immediately and no email goes out.

Idempotent: safe to call on a campaign that's already cancelled,
already sent, or doesn't have a future fire time. (For sent ones the
field is just overwritten; the Inngest function already returned long
ago.)

### `POST /campaigns/{id}/reactivate`
Reverses `/cancel`. Sets `scheduled_status: "pending"`.

**Only meaningful if the Inngest scheduled-send function hasn't woken up
yet** (i.e., `scheduled_at` is still in the future). For past fires the
function instance has already returned (early, because the field was
"cancelled"), and Inngest events are one-shot — flipping the field
won't make Inngest re-fire it. This endpoint is for the case "I
cancelled at 9pm, fire is at 6am, I want to put it back at 10pm."

For dispatching a fresh fire, use `/campaigns/{id}/send` again — that
queues a new Inngest event.

### `POST /campaigns/bulk-cancel`
Body: `{ "campaign_ids": [uuid, uuid, ...] }`. Max 100 ids per call.
Cancels all matched campaigns within the workspace in a single Postgres
update. Returns:
```json
{
  "cancelled": <n>,
  "requested": <body length>,
  "not_found": [<ids that didn't match anything in this workspace>],
  "campaigns": [<updated rows>]
}
```

### `POST /campaigns/bulk-reactivate`
Bulk reverse. Same body shape as bulk-cancel; same response shape with
`reactivated` instead of `cancelled`.

---

## Schema change

[src/agent/schemas.ts](../src/agent/schemas.ts) gained a shared
`bulkCampaignIdsSchema` (max-100 list of UUIDs), aliased as
`bulkCancelSchema` and `bulkReactivateSchema`. Both bulk endpoints
parse with the same shape.

---

## How this would have helped on 2026-05-02

The session notes for 2026-05-02 record the moment where 10 overnight
batches needed to be cancelled mid-flight because the user wanted to
edit copy first. Without these endpoints, I had to write a one-off
script (`_work/cancel-overnight.ts`) that connected directly to
Supabase. Then when the user changed their mind and wanted them
re-activated, another one-off (`_work/uncancel-overnight.ts`).

With this branch merged, the same operations become two API calls:

```
# Cancel all 10
POST /api/agent/musicalbasics/campaigns/bulk-cancel
{ "campaign_ids": [10 uuids] }

# Re-activate when ready
POST /api/agent/musicalbasics/campaigns/bulk-reactivate
{ "campaign_ids": [same 10 uuids] }
```

Both API calls work for any external agent with the AGENT_API_KEY — no
local repo access, no DB credentials.

---

## What's NOT on this branch

- `POST /rotations/{id}/cancel` — the rotation send dispatch creates
  child campaigns with their own `scheduled_at`. To cancel a rotation
  you'd cancel each child individually (or via `/bulk-cancel`). A
  dedicated rotation-level cancel endpoint could be added later if it
  becomes a common pattern.
- Cancel endpoint that also dispatches an Inngest event to "kill" the
  in-flight function instance early. Not necessary because the
  scheduled-send function is dormant in `step.sleepUntil` until fire
  time; it doesn't consume resources while it waits, and the bail
  check at wake-up prevents the actual send.
- A way to cancel a campaign whose send is currently *in progress*
  (not scheduled, but mid-execution in `/api/send-stream`). The
  pipeline doesn't poll for cancel signals between recipients. Adding
  per-recipient cancel checks is a bigger refactor and probably a
  nice-to-have rather than a must-have.

---

## Commits

| Hash | Summary |
|---|---|
| `2e73f49` | feat(agent-api): POST /campaigns/{id}/cancel + /campaigns/bulk-cancel |
| (this commit) | feat(agent-api): POST /campaigns/{id}/reactivate + /campaigns/bulk-reactivate |

---

## Merge readiness

- [x] Type-checks clean
- [x] No changes to existing endpoint behavior (purely additive)
- [x] Schema changes are additive; existing schemas (`bulkCancelSchema`)
      remain exported
- [x] Documented in `docs/EMAIL-AGENTS-API.md`
- [x] Already-deployed Inngest functions need no changes — the bail
      check on `scheduled_status === "cancelled"` was added when the
      Inngest scheduled functions were first written
- [ ] Manual e2e test against deployed instance after merge: cancel +
      reactivate + verify Inngest behavior

When ready to merge: open a PR from
`feat/cancel-endpoint` → `main`, get a quick review, merge. Vercel
auto-deploys main. Then test against
`https://dreamplay-email-3.vercel.app/api/agent/musicalbasics/campaigns/...`.
