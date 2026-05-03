# Branch: feat/overnight-reconciliation

## Summary

Two changes triggered by the 2026-05-03 overnight send failure:

1. **Throttle fix** (in this commit): cut send-stream's per-recipient
   throttle from 600ms to 100ms. The old value made any batch >= ~430
   recipients exceed Vercel's 300s `maxDuration`, killing the function
   before it could write `sent_history` rows or flip the campaign status.
2. **Reconciliation** (already applied to production via `_work/reconcile-overnight.ts`,
   not committed because `_work/` is gitignored for PII reasons): backfilled
   4,463 `sent_history` rows across the 9 stuck slots and flipped each to
   `status: completed, scheduled_status: sent` with `total_recipients`
   populated.

## What happened on 2026-05-03

Schedule: 10 batches across 06:00Z-10:30Z (4,569 recipients total, Variant A).

- All 10 Inngest functions woke on time. First Resend opens for each slot
  arrived within 20-30s of the slot's scheduled time, proving the sends
  fired.
- 9 of 10 batches (500 recipients each) timed out before the post-loop
  bookkeeping. Result: emails went out (we estimate ~430/500 per slot
  before the 300s kill, ~3,852 of 4,500), but `sent_history` was empty
  and `status` was stuck at `scheduled / pending`.
- 1 of 10 batches (slot 10, 69 recipients) finished cleanly in ~48s.

## Root cause

[app/api/send-stream/route.ts:372](../app/api/send-stream/route.ts#L372)
slept 600ms between recipients. 500 * 0.6s = 300s = `maxDuration`. The
sent_history `INSERT` and campaigns `UPDATE` after the loop never ran.

## The fix

Change [app/api/send-stream/route.ts:372](../app/api/send-stream/route.ts#L372)
from 600ms to 100ms. 100ms = 10 req/s = Resend's default Pro-tier rate
limit. Send time for a 500-recipient batch goes from ~300s+ to ~100-150s,
comfortably under the 300s ceiling.

## What this branch does NOT fix

- **Per-Inngest-step chunking.** A 500-recipient batch is still one HTTP
  request that holds the Inngest step open for ~100s. If Resend latency
  ever spikes or the recipient count goes higher, we could still time out.
  Long-term, send-stream should chunk recipients into Inngest steps (each
  step handles N recipients, sleeps between steps, writes its own
  sent_history rows). That refactor is out of scope here.
- **Idempotency for partial sends.** If send-stream is killed mid-loop,
  there is still no record of which subscribers were sent to. Future
  reconciliation would need the same `_work/reconcile-overnight.ts`-style
  backfill. Per-step bookkeeping (above) would solve this.

## Verification

- Typecheck clean: `npx tsc --noEmit`
- Reconciliation verified via `_work/check-overnight.ts` after applying:
  all 10 batches now show `status: completed`, `scheduled_status: sent`,
  `total_recipients` populated (492-500 per slot, 69 for slot 10,
  total 4,532 across all 10).

## Reconciliation strategy used (for the record)

Strategy: **aggressive** (`_work/reconcile-overnight.ts` default). For
each stuck batch, wrote a `sent_history` row for every active subscriber
in the original `variable_values.subscriber_ids` list (492-500 per slot
after filtering by current `status='active'`). The alternative
(`--confirmed-only`, restricted to subscribers with at least one event)
would have backfilled only ~30-160 per slot, leaving the rest eligible
for an unintended re-send. We chose to err on "do not re-send" rather
than "do not over-claim recipients."

Each backfilled row carries
`merge_tag_log: { reconciliation: "timeout-2026-05-03", strategy: "aggressive" }`
so future audits can distinguish backfilled rows from real sends.

## Engagement on the overnight run (as of 12:25Z)

| metric            | events | unique subs |
|-------------------|-------:|------------:|
| opens             |  1,189 |         716 |
| clicks            |     46 |          21 |
| unsubscribes      |     57 |             |

Versus an estimated ~3,921 actually-delivered: ~18% open rate, ~0.5%
click rate, ~1.5% unsub rate. (Versus the reconciled 4,532 marked-sent:
~16% / ~0.5% / ~1.3%. Real number is somewhere between.)
