# Send audit log

A running record of pre-send safety audits performed by the
`send-safety-auditor` subagent (or an in-session general-purpose
stand-in when the subagent definition isn't loaded yet). Newest at top.

Each entry captures: the planned action, the auditor's verdict, what
each checklist section reported, what was caught and corrected before
the send, what was deferred, and the outcome once the send completed.

Add a new entry to this file every time the auditor runs against a
real send. If the auditor caught nothing, still record it. The
absence of findings is itself useful data over time, and an empty
entry shows the audit happened.

---

## 2026-05-21 late afternoon, evening — Campaign 1 FINAL 240+240 (Send 9 + Send 10)

**Planned**: Final Campaign 1 cleanup. Two children of 240 Gmail subscribers each, both clones of Variant B parent `db10a687-...` with the personalization greeting patched in (winning variant from Send 7). Subject "My upcoming concert and livestream". Sender `Lionel Yu <lionel@musicalbasics.com>`, append-mode click tracking. Send A child `20eea907-428d-4e17-b894-2f8b5ca0a2d6` at `2026-05-21T21:00:00Z`. Send B child `a37cc569-8136-431e-bf88-aac6b56c603d` at `2026-05-21T22:00:00Z`. Hour-apart stagger. 

**Audience**: 480 Gmail subscribers eligible (active, not Test Account, not Bounced, not yet tagged `done-belgium-followup-b`). Shuffled deterministically, split 240/240 with explicit overlap assertion. All 480 tagged `done-belgium-followup-b` after schedule. This is the last cohort of Campaign 1; pool of untagged-B subscribers now zero. Full active list is now 100% tagged followup-b.

**Audit at**: `2026-05-21T20:05Z`, ~55 min before Send A fire.

**Verdict**: `SAFE`. No findings, no blockers. All standard sections PASS. Throttle math (240 × ~950ms ≈ 228s vs 300s maxDuration) puts utilization at ~76%, comfortable. HTML patch path proven from Send 8 + Send 7. Concurrency lock with 1-hour stagger gives Send A plenty of time to complete (~4 min real wall-clock) before Send B's sleepUntil expires.

**Outcome**: TBD — fires at 21:00Z / 22:00Z this evening. Will append maturity stats to `docs/CAMPAIGN-1-RESULTS.md` once data is in.

**Notes**: The two prior A/B experiments (Send 7 personalization, Send 8 revival) have fully matured. Mature results:
- Send 7A (personalized): 105 / 300 = **35.0%** Gmail opens, 2 clicks. Send 7B (un-personalized): 86 / 300 = **28.7%** Gmail opens, 2 clicks. Personalization adds **+6.3pp opens, tied clicks**.
- Send 8A (Variant A revival to non-openers): 39 / 214 = **18.2%** Gmail opens, 0 clicks. Send 8B (Variant B fresh to non-openers): 58 / 209 = **27.8%** Gmail opens, 0 clicks. Fresh subject beats re-send by **+9.6pp opens** on cold audience.

Both findings informed the Campaign 1 final variant choice (personalized + livestream subject). Full results write-up in [docs/CAMPAIGN-1-RESULTS.md](CAMPAIGN-1-RESULTS.md).

---

## 2026-05-16 early morning — 250/250 Gmail revival A/B (Send 8)

**Planned**: 250 + 250 Gmail re-engagement A/B against a clean audience class.

**Audience filter (clean re-engagement)**: Active Gmail subscribers who (a) received at least one "After years of work, two things are finally happening" campaign, (b) are NOT tagged `done-belgium-followup-b` (have never been touched by ANY Variant B follow-up wave — covers both "livestream" subject and the earlier May 8-9 Variant B sends with different subjects), and (c) have zero open events across either cohort. **641 candidates total → 500 picked, 250 per arm.** Many of these recipients are likely 2026-05-03 redirect-mode bulk-flag victims whose original Variant A copy never reached their inbox.

**Notable**: 100% of the clean audience is Gmail. Non-Gmail recipients of "After years of work" who hadn't opened it have ALL since been touched by some Variant B follow-up (the non-Gmail pool exhausted during Sends 1-6). So the clean re-engagement pool is Gmail-only by side effect of prior tagging.

**Arm A**: Variant A parent (`b04a217d-...`), subject "After years of work, two things are finally happening", body unchanged. Child `57ecce8e-6c9d-48a5-be87-92c5e08cc163`. The exact email these recipients didn't open before.

**Arm B**: Variant B parent (`db10a687-...`), subject "My upcoming concert and livestream", with `<p>Hi {{first_name}},</p>` greeting paragraph patched in. Child `bb463621-9ecf-4c18-9534-69e45ee658bf`. First time these recipients see this content.

**Audit at**: `2026-05-16T05:28Z`, ~30 min before the original scheduledAt.

**First-pass verdict**: `NEEDS_REVIEW`. The auditor flagged:

| Finding | Detail |
|---|---|
| **B. Throttle headroom — FAIL** | Original draft was 400 per arm. 400 × ~1050ms ≈ 420s vs 300s `maxDuration`. Auditor recommended truncating to ≤ 250 per arm. |
| **Re-targeting concern** | 587 of original 800 (73%) were already tagged `done-belgium-followup-b`. Surfaced as a CLAUDE.md rule deviation. |
| All other sections | PASS — idempotency, concurrency lock, DB constraint, HTML state (Arm B greeting patched correctly, Arm A no double-personalization despite Variant A's built-in `{{first_name}}`), A/B disjointness all verified directly against the live DB. |

**Resolution (before fire)**:
1. **Truncated to 250 per arm** per auditor recommendation. Each child ~225s within maxDuration, both arms fire on-schedule with no retry-cycle noise.
2. **Tightened audience to "received_A AND NOT tagged done-belgium-followup-b"** — strict re-engagement filter. Dropped from 800 to 500 recipients across a cleaner pool (641 candidates). Re-targeting concern resolved: no one in the final 500 has been touched by any Variant B follow-up.
3. Drafts updated in-place via direct Supabase UPDATE of `variable_values.subscriber_ids` rather than re-cloning, so the existing test sends and pre-vetted HTML state remained valid.

**Time slip during execution**: Scheduled values were `2026-05-16T06:00:00Z` (Arm A) and `06:05:00Z` (Arm B). The conversation paused ~70 minutes between final approval prompt and user's "go" confirmation, so by the time the `/send` calls fired both scheduledAt values were in the past. Inngest's `step.sleepUntil` with a past Date resolves immediately, so the two arms fired back-to-back via the concurrency lock starting `~2026-05-16T06:39Z`. Effective fire times: Arm A ~06:39Z (≈ 2:39 AM EDT), Arm B ~06:43Z. Still in the overnight engagement bucket; not a deliverability concern.

**Outcome (delivery)**: Both campaigns completed cleanly. Arm A delivered **214 / 250** (`57ecce8e-...`); Arm B delivered **209 / 250** (`bb463621-...`). **77 recipients (~15%) were filtered out at send-time** by send-stream's `status="active"` filter at [app/api/send-stream/route.ts:199](../app/api/send-stream/route.ts#L199). The most plausible cause: some recipients became `unsubscribed` between manifest build (2026-05-15 evening) and send (2026-05-16 06:39-06:43Z). This is a non-trivial gap on a re-engagement audience — these 500 had already received the bulk-flagged Variant A copy weeks earlier; Gmail List-Unsubscribe header processing may have flipped some of them. Note that those 77 recipients ARE still tagged `done-belgium-followup-b` (the bulk-tag step ran before send-stream filtered them) so they won't be re-targeted in this rotation. Net: 423 emails out, 87% of the planned 500.

**Outcome (engagement)**: TBD. Honest signal will be Gmail open rate at 24-48h elapsed. Hypothesis: the Variant A arm should show a recovery effect (recipients who never saw the bulk-flagged original get a clean inbox delivery this time); Variant B is testing whether a fresh subject reaches them better.

### Lessons recorded

- **Time-slip risk on tight-window scheduling**: A 70-minute pause between final-approval prompt and user's "go" confirmation pushed the `scheduledAt=06:00Z` value into the past. Inngest's `step.sleepUntil` with a past Date resolves immediately, so the send fired ~40 min later than planned. No deliverability harm (the late-night/overnight window is actually one of our strongest in the time-of-day analysis), but the planned vs effective fire diverged. **Process fix**: before calling `/send` on a draft, the scheduler script should compare `scheduledAt` to current time and either (a) refuse to schedule with a past value, (b) auto-bump to `now() + min_lead`, or (c) require an explicit `--allow-past-fire` flag. The agent API itself could enforce the same. Until that lands, when approving a tight-window send, the conversation should confirm time within the last few minutes of the actual `/send` call, not at audit-pass time.
- **Active-status attrition between manifest and send**: 15% of a re-engagement audience was filtered out at send-time because subscribers became inactive between when we picked them (manifest build, T-12h) and when send-stream ran (T-0). For audiences of "people who didn't engage with prior sends," this attrition rate is much higher than for fresh audiences (Sends 1-6 saw <2% attrition). **For the spreadsheet to match what actually shipped**, regenerate the audience CSV after the send completes, filtered to subscribers who actually have a `sent_history` row for the child. Or accept that the planned-vs-actual gap is real and informative ("X% of non-openers unsubscribe before we re-engage them"). The dropped 77 are still tagged `done-belgium-followup-b` so they won't be re-picked — but if the user wants to re-target them on the way back to active, they'd need to drop the tag first.
- **The auditor caught a real-cost mistake**: First time the audit returned `NEEDS_REVIEW` and the fix mattered. The 400/400 path would have shipped, completed via idempotency retry, but generated 4 "error"-marked `send_logs` rows and shifted Arm B's fire by ~10 minutes. The truncation to 250 per arm + audience tightening took ~5 minutes total and saved ~30 minutes of operator confusion + log noise reading. Validates keeping the audit as a hard gate, not an optional check.

---

## 2026-05-15 afternoon — 300/300 Gmail A/B personalization test (Send 7)

**Planned**: 300 Gmail recipients per arm, split from a single random shuffle, both clones of the un-personalized Variant B parent template `db10a687-...`. Arm A (personalized, child `3c85a846-4886-48c2-a25d-77e97a9b5fb3`) gets a `<p>Hi {{first_name}},</p>` greeting paragraph re-inserted via direct supabase UPDATE to the child's `html_content` before scheduling. Arm B (un-personalized, child `706ee826-ce55-4e51-83c4-d77b5c0b6895`) inherits the parent's no-greeting state. ScheduledAt: `2026-05-15T19:05Z` / `2026-05-15T19:10Z`. Resolves the personalization-affects-click-rate hypothesis from Send 4's 1-click outcome.

**Audit at**: `2026-05-15T18:00Z`, ~1h before fire.

**Verdict**: `UNSAFE` on first pass → `SAFE` after fix → ran.

### Section-by-section findings

| Section | First pass | After fix |
|---|---|---|
| A. Idempotency | PASS | PASS |
| B. Throttle headroom | PASS | PASS — 300 × ~900ms ≈ 270s vs 300s maxDuration. Tight (90% utilization); flagged but acceptable because idempotency makes any retry a no-op for already-sent recipients |
| C. Concurrency lock | PASS | PASS |
| D. DB UNIQUE constraint | PASS | PASS |
| E. Audience query | PASS | PASS — Gmail-only filter on top of done-tag + Test Account exclusion; 600-cap |
| E2. scheduledAt freshness | PASS | PASS — T+65m / T+70m |
| F. Rotation safety | PASS | PASS |
| G. State guards | PASS | PASS |
| H. HTML patch correctness | **FAIL** | PASS (after fix) |
| I. A/B integrity | PASS (conditional on H) | PASS |

### Blocker caught and fixed before send

**H. HTML patch indentation mismatch.** The script's `FIND` / `REPLACE` constants used 18-space + 20-space indentation for the `<p>` and inner text, but the live parent template's HTML uses 14-space + 16-space indentation. The mismatch came from my prior visual inspection — earlier diagnostic scripts that printed the HTML pre-padded each line with 4 spaces for terminal readability, so the visible indentation was 4 spaces deeper than the actual stored content. The auditor caught this by reading the live parent and counting bytes; the pre-flight check at `addGreetingToChild` would have aborted the whole script before any side effects (no test send, no clone, no schedule), but with no positive output the test wouldn't have run either.

**Fix**: dedented both `FIND` and `REPLACE` constants by 4 spaces ([_work/ab-test-personalization-300-300.ts:48-58](../_work/ab-test-personalization-300-300.ts)). Dry-run via `_work/dryrun-patch.ts` confirmed: 1 FIND occurrence in the parent, single greeting in the patched result, html length grew by exactly 195 chars (matching what we removed on 2026-05-13). After the fix the production script ran cleanly: test sends went out, arm A's child was patched correctly, both children scheduled.

### Lessons recorded

- **Pre-padded HTML dumps are a debugging trap.** When inspecting HTML stored in a JSONB / TEXT column via a diagnostic script that pretty-prints with indentation prefix, the visible whitespace is NOT the source-of-truth whitespace. The auditor now reads the column directly without printing, and counts bytes. Future scripts touching template HTML should use a regex-based patch (whitespace-tolerant) or a byte-count probe before committing the exact-string FIND. The current script's `addGreetingToChild` has the right safeguards (anchor-must-exist + post-patch validation); the fix was to the constant strings only.
- **Auditor caught a real bug.** First time the audit returned anything other than SAFE on first pass. Worked exactly as intended — read-only investigation found a content issue that pre-flight checks in the script would have caught at runtime, but at the cost of a fully-aborted run with no test output.

### Outcome

Tests fired immediately to 8 Test Accounts:
- Un-personalized test child: `144980e8-dd9d-4401-8f8d-44498fe1f0ee`
- Personalized test child: `816c7c09-094d-44ac-b725-a9e6ea49bdbc`

Production scheduled, 600 tagged. Pool after fire: Gmail **980** / non-Gmail 0.

A/B results TBD — fires at 19:05Z / 19:10Z. The mature comparison will be: Arm A (personalized) Gmail click rate vs Arm B (un-personalized) Gmail click rate. Combined with Send 4 / Send 5 / Send 6 prior data points, this gives n=300 per condition at this single send + cross-send aggregation.

---

## 2026-05-15 morning — 199 Gmail + 199 non-Gmail mixed final batch (Send 6)

**Planned**: 199 Gmail + 199 non-Gmail = 398 total. Variant B parent `db10a687-...`. Gmail child `7af65782-dabf-4b73-899c-cc86f078d9c9` at `2026-05-15T13:15:00Z`, non-Gmail child `9234d152-1598-4ad9-8b6c-9af2364ce6f1` at `2026-05-15T13:20:00Z`. This **exhausts the non-Gmail pool**: after this fires, only 199 non-Gmail subscribers were ever left and all 199 will have been targeted. Future sends will be Gmail-only or require a new audience definition.

**Audit at**: `2026-05-15T10:14Z`, ~3 hours before fire.

**Verdict**: `SAFE`. No findings, no blockers.

| Section | Verdict | Detail |
|---|---|---|
| A. Idempotency | PASS | [send-stream/route.ts:227-260](../app/api/send-stream/route.ts#L227), per-row insert :416-422 |
| B. Throttle headroom | PASS | 199 × ~900ms ≈ 180s vs 300s maxDuration (60% utilization) |
| C. Concurrency lock | PASS | All 4 functions share `global-send-lock`; Send 5's 10:25/10:30Z children complete well before Send 6's 13:15Z fire |
| D. DB UNIQUE constraint | PASS | Applied and verified |
| E. Audience query | PASS | [schedule-250-250.ts](../_work/schedule-250-250.ts) with `SAMPLE_SIZE=199`; `Math.min(SAMPLE_SIZE, nonGmail.length)` correctly takes all 199 non-Gmail; Gmail pool 1,779 has ample headroom |
| E2. scheduledAt freshness | PASS | now 10:14Z, Gmail T+181m, non-Gmail T+186m |
| F. Rotation safety | PASS | Not exercised |
| G. State guards | PASS | cancelled/sent early returns + flip after send |
| H. Child labels | PASS | "199 Gmail @ ..." and "199 non-Gmail @ ..." (script now uses `${gmailPicks.length}` instead of hardcoded "250") |

**Blockers caught**: none.

**Script change applied as part of this audit**:
- `_work/schedule-250-250.ts:138` — child name was hardcoded `"250 Gmail @ ..."` even though `nonGmailPicks.length` was already dynamic at :165. Updated Gmail to also use `${gmailPicks.length}` for symmetry. Future runs at any SAMPLE_SIZE label correctly.

**Pool watch (after this send fires)**:
- Gmail eligible: 1,580 (was 1,779, minus 199 picked)
- non-Gmail eligible: **0** (was 199, minus 199 picked) — pool exhausted
- Total eligible for future sends in this rotation: 1,580 Gmail-only

**Outcome**: TBD — fires at 13:15Z / 13:20Z. Will record Send 6 stats once mature, alongside aggregate Sends 5+6 (the two un-personalized data points) vs Sends 1-3 (personalized) to nail the personalization-click-rate hypothesis.

---

## 2026-05-15 early morning — 250 Gmail + 250 non-Gmail Variant B (Send 5)

**Planned**: 250 Gmail + 250 non-Gmail of Variant B parent `db10a687-...`, scheduled `2026-05-15T10:25:00Z` (Gmail child `8592210e-19a6-4a17-a45e-a89e8c1252cd`) / `2026-05-15T10:30:00Z` (non-Gmail child `a69983eb-f238-4473-8825-a83eb839aeb4`). Second send with the un-personalized template (greeting block removed on 2026-05-13 before Send 4 fired).

**Audit at**: `2026-05-15T09:53Z`, ~30min before fire.

**Verdict**: `SAFE`. No findings, no blockers.

| Section | Verdict | Detail |
|---|---|---|
| A. Idempotency | PASS | [send-stream/route.ts:227-260](../app/api/send-stream/route.ts#L227), :416-422 |
| B. Throttle headroom | PASS | 250 × ~900ms ≈ 225s vs 300s maxDuration |
| C. Concurrency lock | PASS | All 4 functions share `global-send-lock` |
| D. DB UNIQUE constraint | PASS | Applied and verified |
| E. Audience query | PASS | [schedule-250-250.ts:88-107](../_work/schedule-250-250.ts) |
| E2. scheduledAt freshness | PASS | now 09:53Z, Gmail T+32m, non-Gmail T+37m |
| F. Rotation safety | PASS | Not exercised |
| G. State guards | PASS | cancelled/sent early returns + flip after send |

**Blockers caught**: none.

**Context worth flagging**: Send 4 (the first un-personalized send) showed Gmail open rate steady at 32.4% (in line with personalized sends) but Gmail click count dropped to 1 vs 2-5 on prior sends. Real human click count across the 500-recipient send was ~2 vs ~5-7 for personalized sends. Send 5 is effectively the replication needed to confirm whether the click-rate dip is a real personalization effect or sample variance. Both un-personalized data points will be compared.

**Pool watch**: After Send 5 fires, pool drops to Gmail 1,779 / non-Gmail **199**. The next send (Send 6) is the point where non-Gmail can no longer support a 250 split — Send 6 will be the 199 non-Gmail + 199 Gmail mixed final batch, or Gmail-only from here on.

**Outcome**: TBD — fires at 10:25Z / 10:30Z. Honest Gmail-only figures will be appended after maturity.

---

## 2026-05-13 afternoon — 250 Gmail + 250 non-Gmail Variant B (Send 4)

**Planned**: 250 Gmail + 250 non-Gmail of Variant B parent template `db10a687-...`, scheduled `2026-05-13T18:50:00Z` (Gmail child `3ac3194f-6d16-4a7b-99f5-664ab919bd94`) / `2026-05-13T18:55:00Z` (non-Gmail child `6f7568be-c7e1-4170-963c-78f54d09e9db`). Eligible pool dropping: 2,978 → 2,478 after this send.

**Audit at**: `2026-05-13T17:46Z`, ~1h before fire.

**Verdict**: `SAFE`. No findings, no blockers.

| Section | Verdict | Detail |
|---|---|---|
| A. Idempotency | PASS | [send-stream/route.ts:227-260](../app/api/send-stream/route.ts#L227), :416-422 |
| B. Throttle headroom | PASS | 250 × ~900ms ≈ 225s vs 300s maxDuration |
| C. Concurrency lock | PASS | All 4 functions share `global-send-lock` |
| D. DB UNIQUE constraint | PASS | Applied and verified |
| E. Audience query | PASS | [schedule-250-250.ts:88-107](../_work/schedule-250-250.ts) |
| E2. scheduledAt freshness | PASS | now 17:46Z, Gmail T+63m, non-Gmail T+68m |
| F. Rotation safety | PASS | Not exercised |
| G. State guards | PASS | cancelled/sent early returns + flip after send |

**Blockers caught**: none.

**Pool watch**: non-Gmail pool now 699 (was 1,199 at the start of the rotation). At 250/send, it exhausts in ~3 more sends — well before the Gmail pool (2,029 remaining). After non-Gmail is depleted, future sends will either need to be Gmail-only or merge the remaining audiences.

**Outcome**: TBD — fires at 18:50Z / 18:55Z. Stats and Gmail-only honest figures appended after maturity.

---

## 2026-05-13 early morning — 250 Gmail + 250 non-Gmail Variant B

**Planned**: 250 Gmail + 250 non-Gmail of Variant B parent template `db10a687-4233-4313-8431-8d2fa64a15c4` (subject "My upcoming concert and livestream"), sender `Lionel Yu <lionel@musicalbasics.com>`, append-mode click tracking, scheduled `2026-05-13T09:50:00Z` (Gmail child `a42899e3-6e81-4c3d-8058-aaa2b9fe3612`) / `2026-05-13T09:55:00Z` (non-Gmail child `f4bb8497-9428-4718-abfc-1127806428dc`). Third 250/250 send in the Variant B follow-up sequence.

**Audit at**: `2026-05-13T08:46Z`, ~1h before the planned fire.

**Verdict**: `SAFE` on the first pass. No blockers caught.

### Section-by-section findings

| Section | Verdict | Detail |
|---|---|---|
| A. Idempotency | PASS | `sent_history` filter pre-loop ([send-stream/route.ts:227-245](../app/api/send-stream/route.ts#L227)); per-recipient insert in loop :416-425; early-bail no-op at :246-260 preserves campaign stats on retry |
| B. Throttle headroom | PASS | 200ms throttle ([send-stream/route.ts:444](../app/api/send-stream/route.ts#L444)); `maxDuration=300` at :10. 250 × ~900ms ≈ 225s. Margin: 75s |
| C. Concurrency lock | PASS | All four agent-*.ts functions share `{ key: "'global-send-lock'", limit: 1, scope: "account" }` |
| D. DB UNIQUE constraint | PASS | Applied and verified earlier this session via duplicate-INSERT probe (`23505 duplicate key value violates unique constraint`) |
| E. Audience query | PASS | [schedule-250-250.ts](../_work/schedule-250-250.ts) excludes Test Account + done-belgium-followup-b; 250-cap slice via shuffle |
| E2. scheduledAt freshness | PASS | Current 08:46Z, planned 09:50Z (T+63m) / 09:55Z (T+68m). Both in the future, ~1h lead as intended, 5-min stagger preserved |
| F. Rotation safety | PASS | Not exercised. sendKey lookup path verified |
| G. State guards | PASS | cancelled / sent early returns + scheduled_status flip after send |

### Blockers caught and fixed before send

None this run. The previous audit (2026-05-12 evening) caught a stale `scheduledAt` issue and pushed the auditor to check it as a top-level section (E2); E2 is now a routine PASS because the scheduler script was updated to fresh values before the audit ran.

### Deferred / accepted risks

- Stale doc-comment in `_work/schedule-250-250.ts:1-10` referencing "600ms throttle, no concurrency lock" — code is current, comment is not. Cosmetic only; flagged for cleanup after the send.
- Throttle headroom (75s) is comfortable but not enormous. If Resend p99 latency spikes past ~1000ms per call, a 250-recipient run could brush the 300s ceiling. Watch for retries in Inngest dashboard after the fire.

### Outcome

TBD — children fire at 09:50Z / 09:55Z. Stats and Gmail-only honest figures will be appended after the send matures.

### Lessons recorded

None new this run. The audit ran clean against the post-incident
codebase, which is the point of the audit log: zero-finding entries
confirm the protections continue to hold.

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

**Honest metrics (Gmail-only; see Lessons below for why):**

| Metric | At ~5h | Comparable to last night (24.7h mature) |
|---|---:|---:|
| Gmail open rate | 22.0% | 30.0% |
| Gmail click rate | 0.8% | 0.8% |

**Headline (mixed-provider) metrics, retained for reference but not engagement signal:**

- Raw open rate: 27.2%, unique 21.6%
- Raw click rate: 2.0% (10 clicks across 500 recipients)
- 0 unsubs

The headline figures are inflated by Apple Mail Privacy Protection
opens (iCloud / Apple Mail prefetch every image on delivery, firing
the open pixel; ~85% mature rate, ~0% click rate) and by corporate
URL-safety scanners on `.edu` / `.gov` / law-firm / medical-org
domains (which click every link in every email within seconds of
delivery). 100% of click events from "Other"-bucket domains across
both 2026-05-12 sends fired within 5 minutes of send, often 2-3
clicks per recipient on a single-link email. **Real human click
count for this 500-recipient send is approximately 4** (2 Gmail
+ 1 Microsoft + 1 Yahoo), not the 10 the raw number suggests.

### Lessons recorded

- **Always re-check hardcoded `scheduledAt` values in scheduler scripts before re-running.** The previous run's constants persist as a footgun. Consider deriving `scheduledAt` from `Date.now() + offsetMinutes` in the script, with the offset passed as an argument or env var, so the values can't go stale.
- **The auditor should explicitly include time-of-fire validation as a check.** Currently it's caught as a sub-bullet of "audience / scheduler" but it's a distinct failure mode that deserves its own line. Update the auditor prompt next pass.
- **The DB UNIQUE constraint probe script ([_work/verify-unique-constraint.ts](../_work/verify-unique-constraint.ts)) is reusable.** Run it any time the migration status is in doubt. It does a single duplicate INSERT against an existing row and reports the response code.
- **Total open/click rates are noise. Lead with Gmail-only.** Verified on 2026-05-12 by breaking down opens and clicks by email-provider domain ([_work/check-opens-by-provider.ts](../_work/check-opens-by-provider.ts), [_work/check-other-domain-clicks.ts](../_work/check-other-domain-clicks.ts)). Findings:
  - Apple iCloud open rate runs 60-86% with ~0% click rate. Apple Mail Privacy Protection prefetches every image on delivery; the open pixel is fired by a privacy proxy, not a human.
  - Yahoo and AOL open rates also heavily prefetched (50-85%).
  - 100% of clicks from "Other"-bucket domains (`.edu`, `.gov`, law firms, medical, corporate) on 2026-05-12 fired within 5 minutes of send, often 2-3 clicks per recipient. These are inbound URL-safety scanners (Mimecast, Proofpoint, Microsoft SafeLinks, etc.) — not humans.
  - **Gmail metrics are the only reliable engagement signal.** Gmail's image proxy doesn't pre-fetch; Gmail tabs don't pre-click. Stable Gmail open rate ~30%, Gmail click rate ~0.8% on this audience.
  - Apple click rate, when non-zero, is also a real human signal (MPP doesn't follow links) but the sample is tiny.
  - When comparing subject lines or sends, only compare Gmail rates. Non-Gmail rates measure scanner aggressiveness, not human interest.
