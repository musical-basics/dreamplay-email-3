# Send audit log

A running record of pre-send safety audits performed by the
`send-safety-auditor` subagent (or an in-session general-purpose
stand-in when the subagent definition isn't loaded yet). Newest at top.

Each entry captures: the planned action, the auditor's verdict, what
each checklist section reported, what was caught and corrected before
the send, what was deferred, and the outcome once the send completed.

Add a new entry to this file every time the auditor runs against a
real send. If the auditor caught nothing, still record it — the
absence of findings is itself useful data over time, and an empty
entry shows the audit happened.

---

## 2026-05-12 evening — 250 Gmail + 250 non-Gmail Variant B

**Planned**: 250 Gmail + 250 non-Gmail recipients of Variant B parent
template `db10a687-4233-4313-8431-8d2fa64a15c4` (subject "My upcoming
concert and livestream"), sender `Lionel Yu <lionel@musicalbasics.com>`,
append-mode click tracking, scheduled `2026-05-12T21:25Z` /
`2026-05-12T21:30Z`. Same scheduler pattern as the 2026-05-12 02:25Z
run that double-sent.

**Audit at**: `2026-05-12T20:21Z`, ~1h before the planned fire.

**Verdict**: `NEEDS_REVIEW` → became `SAFE` after the two findings
below were addressed.

### Section-by-section findings

| Section | Verdict | Detail |
|---|---|---|
| A. Idempotency | PASS | `sent_history` filter at [send-stream/route.ts:227-238](../app/api/send-stream/route.ts#L227); early bail at :246-260; per-row insert at :416-422; insert error path log+continues at :423-425 |
| B. Throttle headroom | PASS | `maxDuration=300` at [send-stream/route.ts:10](../app/api/send-stream/route.ts#L10); throttle 200ms at :444. 250 × ~900ms ≈ 225s = 75% of 300s |
| C. Concurrency lock | PASS | All four functions carry `concurrency: [{ key: "'global-send-lock'", limit: 1, scope: "account" }]` ([agent-send.ts:19](../src/inngest/functions/agent-send.ts#L19), [agent-scheduled-send.ts:25](../src/inngest/functions/agent-scheduled-send.ts#L25), [agent-rotation-send.ts:16](../src/inngest/functions/agent-rotation-send.ts#L16), [agent-rotation-scheduled-send.ts:18](../src/inngest/functions/agent-rotation-scheduled-send.ts#L18)) |
| D. DB UNIQUE constraint | UNKNOWN → APPLIED | Migration committed in `25c765d` but no in-repo evidence of Supabase apply. Verified after-the-fact via [_work/verify-unique-constraint.ts](../_work/verify-unique-constraint.ts): duplicate INSERT rejected with `23505 duplicate key value violates unique constraint "sent_history_campaign_subscriber_unique"` |
| E. Audience query | PASS | [schedule-250-250.ts:98](../_work/schedule-250-250.ts) excludes "Test Account"; :99 excludes "done-belgium-followup-b"; sized slice via `shuffle().slice(0, 250)`; each child gets a single `/send` call |
| F. Rotation safety | PASS | Not exercised by this send. `send-rotation` accepts `sendKey`; both rotation Inngest functions generate via `step.run("generate-send-key", ...)` |
| G. State guards | PASS | [agent-scheduled-send.ts:69-74](../src/inngest/functions/agent-scheduled-send.ts#L69) bails on `cancelled` and on `sent`/`completed`; :101-106 flips `scheduled_status="sent"` after send |

### Blockers caught and fixed before send

1. **Stale `scheduledAt` constants in scheduler script**. `_work/schedule-250-250.ts` lines 27-28 still hardcoded `2026-05-12T02:25:00Z` / `02:30:00Z` from the prior night's run. Both times were already in the past. `step.sleepUntil` with a past `Date` fires immediately — the two children would have fired back-to-back at run time, NOT at the intended 21:25Z / 21:30Z slot. **Fix**: updated the two constants to `21:25:00Z` / `21:30:00Z` before invoking the script. **This is the kind of bug the auditor exists for.** A naïve "run the same script that worked last time" would have re-sent immediately and likely tripped the Resend rate limit during the response window.

2. **DB UNIQUE constraint status unconfirmed**. The migration file existed in the repo but I had no way to confirm from the repo whether the user had applied it in the Supabase SQL editor. Flagged as `UNKNOWN`. **Fix**: user applied the migration mid-session; verified after-the-fact with the probe insert script that intentionally tries to insert a duplicate row and confirms the unique-violation response.

### Deferred / accepted risks

- None at send time. All findings were closed before the schedule ran.

### Outcome

Both children fired on time and completed cleanly:

- Gmail child `9624a5ac-c3d7-4ed8-9072-6b1e4999217d`: 250 `sent_history` rows for 250 unique subscribers. No duplicates.
- non-Gmail child `fa037da1-bb49-49c6-a0a9-f0d30a027eb1`: 250 rows for 250 subscribers. No duplicates.

At 4h50m elapsed: 27.2% raw open rate, 21.6% unique, 10 clicks, 0 unsubs. Healthy.

### Lessons recorded

- **Always re-check hardcoded `scheduledAt` values in scheduler scripts before re-running.** The previous run's constants persist as a footgun. Consider deriving `scheduledAt` from `Date.now() + offsetMinutes` in the script, with the offset passed as an argument or env var, so the values can't go stale.
- **The auditor should explicitly include time-of-fire validation as a check.** Currently it's caught as a sub-bullet of "audience / scheduler" but it's a distinct failure mode that deserves its own line. Update the auditor prompt next pass.
- **The DB UNIQUE constraint probe script ([_work/verify-unique-constraint.ts](../_work/verify-unique-constraint.ts)) is reusable.** Run it any time the migration status is in doubt. It does a single duplicate INSERT against an existing row and reports the response code.
