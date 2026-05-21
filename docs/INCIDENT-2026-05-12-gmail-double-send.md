# Incident: 2026-05-12 Gmail double-send

## TL;DR

Every recipient of the `250 Gmail @ 2026-05-12T02:25:00Z` send received the
same email twice, about 30 seconds apart. The non-Gmail child that fired
five minutes later (same code path, same call site, same configuration)
delivered cleanly. Both campaigns wrote complete `sent_history`, but the
Gmail child wrote *250 unique subscribers × 2 = 500 rows*.

Root cause: the `send-broadcast` step in
[src/inngest/functions/agent-scheduled-send.ts](../src/inngest/functions/agent-scheduled-send.ts)
was retried by Inngest after the first invocation's HTTP response did
not return in time, and the send loop in
[app/api/send-stream/route.ts](../app/api/send-stream/route.ts) had no
idempotency guard, the retry re-fetched the full recipient list and
sent everyone a second copy. The non-Gmail child happened to return its
response in time and was not retried.

The Inngest concurrency lock added in
`feat/sequential-send-concurrency` would not have prevented this on its
own. Concurrency limits the number of in-flight function instances; it
does nothing about retries of the *same* instance. The fix needed to be
inside `send-stream` itself.

## Affected campaigns

| Group | Child campaign ID | Unique recipients | sent_history rows | Notes |
|---|---|---:|---:|---|
| Gmail | `ec6bf78f-7fc6-4666-8663-a362b85ac636` | 250 | 500 | Every subscriber received two copies, ~30s apart |
| non-Gmail | `068e10f1-4a96-4dbd-b96c-3094a7ddd858` | 250 | 250 | Clean, sent once |

Both campaigns belong to the May 8-12 Variant B follow-up sequence,
subject "My upcoming concert and livestream", sender `lionel@musicalbasics.com`,
append-mode click tracking.

## Timeline

All times UTC, `2026-05-12`:

| Time | Event |
|---|---|
| `02:25:00` | Inngest fires `agent-scheduled-campaign-send` for the Gmail child. `step.run("send-broadcast")` begins. |
| `02:25:11.418` | First Resend `send` completes for sample subscriber `a94c21b4-...` (Cassandra). |
| `02:25` minute | 93 Resend sends completed (first run). |
| `02:25:43.682` | Second Resend `send` completes for the *same* sample subscriber, **start of the duplicate run**. The 32-second gap matches Inngest's default first-retry delay. |
| `02:26` minute | 170 sends completed (overlap of run 1 tail and run 2 head). |
| `02:27` minute | 170 sends completed (overlap continues). |
| `02:28:39.174` | Last Resend send completes. End of duplicate run. Campaign flipped to `status=completed`, `scheduled_status=sent`. |
| `02:30:00` | Non-Gmail child fires. |
| `02:30:08.382` → `02:33:05.533` | Non-Gmail run completes cleanly. 250 sends, no duplicate. |

## Diagnosis (how we knew)

- `sent_history` for the Gmail child had 500 rows but only 250 distinct
  `subscriber_id` values. Every subscriber appeared exactly twice.
- The per-minute distribution showed two parallel waves of activity,
  not a single linear run. A retry that re-executed the loop would
  look exactly like this.
- The 32-second offset between a recipient's first and second send
  matches Inngest's default retry backoff on transient step failures.
- The non-Gmail child, which ran the same code five minutes later
  with the same throttle and the same recipient count, produced a
  single clean run, ruling out a deterministic bug in either the
  schedule script or the campaign data.

## Root cause analysis

Three things had to be true for the bug to manifest:

1. **The send loop is long.** With a 600ms per-recipient throttle (the
   value live on `main` at the time of the incident, the 100ms /
   200ms reductions are still on unmerged feature branches), a 250
   recipient send takes 250 × ~800ms = 200-210s of wall-clock,
   plus image proxying and template rendering. The Vercel
   `maxDuration` for `/api/send-stream` is 300s, so this leaves only
   a small margin before either Vercel kills the function or
   Inngest's outbound HTTP request times out waiting for the
   response.

2. **The Inngest step is retried on failure.** In
   [agent-scheduled-send.ts](../src/inngest/functions/agent-scheduled-send.ts),
   `step.run("send-broadcast", ...)` performs `fetch(...send-stream)`.
   If that fetch throws (timeout, transient network error, non-2xx
   response) the step throws, and Inngest retries the step with
   exponential backoff (first retry ~30s). Inngest's step memoization
   only protects against re-running steps whose previous run returned
   successfully, a failed step is fully re-executed.

3. **The send loop is not idempotent.** The recipient query at
   [app/api/send-stream/route.ts:208](../app/api/send-stream/route.ts#L208)
   reads every subscriber referenced by the campaign with no regard
   for whether they have already been sent to. The historical
   `sent_history` insert was batched at the end of the loop, so even
   if the first run completed all the sends, the records were
   present by the time the retry fired, but nothing read them
   before the second send.

In this incident, the first run almost certainly completed all 250
Resend calls and successfully inserted 250 `sent_history` rows. The
failure that triggered the retry was on the return path, either
Vercel hit the 300s kill before the response was fully flushed back
to Inngest, or Inngest's HTTP client timed out waiting. Either way,
Inngest saw a step failure, retried, and the second run sent 250
additional emails.

The non-Gmail run avoided the same fate purely by margin: same code,
five minutes later, the response made it back before the timeout.

## The fix

Three commits on `feat/sequential-send-concurrency` collectively close
the failure modes:

1. **`d287ab9`, throttle 600ms → 100ms**
   ([app/api/send-stream/route.ts:437](../app/api/send-stream/route.ts#L437)
  , committed at 100ms, later refined to 200ms = 5 req/s matching
   the Resend rate limit on this account). Drops a 250-recipient
   wall-clock from ~210s to ~75s, well clear of the timeout. Removes
   the *cause* of the retry in this incident.

2. **`99b989e`, shared Inngest concurrency lock.** Adds
   `concurrency: [{ key: "'global-send-lock'", limit: 1, scope: "account" }]`
   on all four send functions (`agent-send`, `agent-scheduled-send`,
   `agent-rotation-send`, `agent-rotation-scheduled-send`). Prevents
   two simultaneous broadcasts from a separate failure mode where
   two distinct Inngest events fire at the same `scheduledAt` and
   the parallel fetches collectively exceed Resend's 5 req/s budget
   (the 2026-05-09 incident where 26% of 400 planned sends failed
   with 429s).

3. **`11d547d`, idempotency guard + per-recipient `sent_history`
   insert.** The primary fix for this incident. Two changes in
   `app/api/send-stream/route.ts`:

   - Before the send loop, query `sent_history` for the current
     `campaign_id` filtered to the candidate `subscriber_id`s. Skip
     any candidate that already has a row. If every candidate has
     already been sent to, bail early without overwriting the
     campaign stats.
   - Insert each `sent_history` row immediately after a successful
     Resend send (was batched at the end of the loop). With the
     per-row write, a retry whose first attempt died *mid-loop*
     also gets handled, the recipients the first run reached have
     their rows already, and the second run skips them.

Together these guarantee at-most-once delivery per recipient per
campaign, even if every other safeguard fails.

## Why concurrency alone wouldn't have helped

The natural intuition is "the concurrency lock would have prevented
this." It would not have. Inngest's `concurrency` config limits how
many *distinct* invocations of the function are in flight at the
same scope-key. A retry of a *single* invocation that previously
failed is not a parallel invocation, Inngest releases the
concurrency slot when the step fails, then reacquires it for the
retry, sequentially. So the second run would have proceeded just
as it did. The fix has to live inside the send loop itself.

## What about earlier sends?

Spot-checking `sent_history` row counts vs. `total_recipients` on
prior Variant B children shows no other duplicates from this
mechanism. The earlier 600ms-throttle batches that came close to
the timeout either finished in time or, as in the 2026-05-03
overnight, timed out before the `sent_history` *insert* ran, which
meant the retry behavior was different (we lost records, but
didn't double-send, the reconciliation script backfilled the
missing rows after the fact).

This is the first observed instance of "first run wrote
`sent_history` AND retry re-ran the loop." It became possible
because the campaigns are now smaller (250 vs 500 recipients),
which lets the loop *complete* under the timeout but still leaves
the response with little headroom.

## Operational impact

- 250 Gmail subscribers received the same email twice, roughly 30
  seconds apart, around 10:25 PM EDT on 2026-05-11. No unsubs
  observed in the immediate aftermath (28-minute check), but
  follow-up monitoring of the next 24-72h is warranted because
  duplicate-receipt is a known unsub trigger.
- No financial impact (Resend bills per email, but 250 extra sends
  is negligible).
- No deliverability infrastructure impact: the duplicate sends did
  not trip Resend's per-second rate limit (the throttle was still
  in effect, so the second run was just slow rather than rapid).
  Gmail did not bulk-flag because of the duplicates.

## What to watch for next time

If a send appears to take longer than ~180s end-to-end on a 250+
recipient batch, raise an alarm, the retry envelope is open.
Specifically:

- Check `sent_history` row count against the campaign's
  `total_recipients` after the campaign is marked completed.
  Ratio should be 1.0 with the idempotency guard in place.
- Check the Inngest dashboard for the `agent-scheduled-campaign-send`
  function run. If you see two attempts on the same event, the
  first one failed.

The idempotency check makes a retry safe but it does not eliminate
retries. Reducing the underlying causes of retries (slow loops,
flaky network) is still the right long-term answer, which is what
the throttle drop accomplishes.

## File references

- Send loop: [app/api/send-stream/route.ts](../app/api/send-stream/route.ts)
- Inngest scheduled-send: [src/inngest/functions/agent-scheduled-send.ts](../src/inngest/functions/agent-scheduled-send.ts)
- Diagnostic script used to identify the double-send:
  `_work/check-gmail-dup.ts` (gitignored)
- Stats check: `_work/check-250-250.ts` (gitignored)
- Schedule script for this send: `_work/schedule-250-250.ts` (gitignored)
- Manifest: `_work/schedule-250-250-manifest.json` (gitignored)
- Session handoff containing send-scheduling context:
  [docs/SESSION-HANDOFF-2026-05-12.md](SESSION-HANDOFF-2026-05-12.md)
- Earlier related incident (timeout-induced sent_history gaps, 2026-05-03):
  [docs/BRANCH-NOTES-overnight-reconciliation.md](BRANCH-NOTES-overnight-reconciliation.md)

## Status

- Fix committed on `feat/sequential-send-concurrency` branch (commit
  `11d547d`). **Not yet merged to `main`.** Production code still
  has the original 600ms throttle, no concurrency lock, and no
  idempotency guard at the time of writing.
- Recommended action: merge `feat/sequential-send-concurrency` to
  `main` before scheduling any further sends. The full follow-up
  audience is 3,978 recipients; running ~250-500/day on the current
  unmerged code keeps the risk envelope open.
