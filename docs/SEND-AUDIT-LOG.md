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

## 2026-05-24 morning, Campaign 2 wave 6: 250/250 BODY A/B continuation (Send 21 + Send 22)

**Planned**: W5 BODY click-optimization A/B continuation. Same HTML files as W5 (Arm A control-body, Arm B click-opt body), same subject "My first new piece in 8 months", same `/no-school-today` landing-page link. Arm A child `a0a27a36-bf2f-4585-92ac-76db9b4b90f0` at `2026-05-24T10:10:00Z`. Arm B child `ca39e9f2-f07d-4776-92cf-b14f7b67a67c` at `2026-05-24T10:15:00Z`. Fires ~1 hour after W5. Goal: pool W5 + W6 for a 500/500 body-A/B read on opens, clicks (first trackable-click data), and unsubs.

**Audience**: Active Gmail subscribers tagged `done-belgium-followup-b`, NOT Test/Bounced/done-no-school-today (excludes W1+W2+W3+W4+W5 = ~2,490 recipients), NOT in C1 final 480. Eligible pool 629 (down from W5's 1,129 since W5 took 500), 500 picked with fresh shuffle (seed `20260524091`, distinct from W5's `20260524085`), split 250/250 disjoint. Tagged `done-no-school-today` after schedule. Pool is getting thin: only ~129 eligible Gmail subs remain in the followup-b cohort after W6 fires.

**No test sends** this wave: HTML and subject already verified visually in W5 test sends.

**Audit at**: `2026-05-24T09:13Z`, ~57 min before Arm A fire. Setup ran at `09:10Z`, schedule fired at `09:14Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: subjects identical between A and B ("My first new piece in 8 months"); html_content DIFFERS (Arm B is 1,095 chars longer due to repeated CTA); Arm A has 3 `/no-school-today` hrefs, Arm B has 4; ZERO `youtu.be/` hrefs in either (only an `img.youtube.com` thumbnail src, which is non-clickable); em-dash count 0 on html_content and subject; cross-overlap math run against W1+W2+W3+W4+W5 union AND no-school-today master log AND C1 final 480, all show 0 overlap; throttle headroom ~25%; W5 completed well before 10:10Z W6 start (W5 Arm B finished ~09:34Z) plus the global concurrency lock would serialize anyway.

**Outcome**: TBD. Both arms fire at 10:10Z / 10:15Z (~06:10 AM / 06:15 AM ET Sunday). Honest signals at 24-48h (pooled W5+W6, n=500/500):
- Per-arm UNIQUE Gmail CLICK RATE on the `/no-school-today` landing page. Headline metric.
- Per-arm Gmail OPEN rate. Same subject + visual frame, so opens should be ~tied; any delta is preheader/first-paragraph length artifact.
- Per-arm UNSUBSCRIBE rate.

Master log appended with 500 more rows.

---

## 2026-05-24 early morning, Campaign 2 wave 5: 250/250 BODY click-opt A/B + first trackable-click landing (Send 19 + Send 20)

**Planned**: First BODY click-optimization A/B for Campaign 2 AND first wave routing the primary CTA through the new `/no-school-today` landing page on belgium.musicalbasics.com instead of a direct youtu.be link. Subject held constant ("My first new piece in 8 months", the W3+W4 challenger). Designed Style 1 visual frame held constant. Arm A child `b8ff9550-83ef-426d-a5ec-7d1364baddc3` at `2026-05-24T09:25:00Z` carries the long-form W1-W4 personal-narrative body (just URLs swapped). Arm B child `419c195b-3a9a-458e-9ee2-250260653fa1` at `2026-05-24T09:30:00Z` carries the click-optimized body: short 1-sentence intro, early "Play No School Today" CTA after the intro, shorter story, repeated "Listen now" CTA after the story, unchanged Belgium tie-in + tickets CTA + sign-off.

**Why the landing-page swap matters for the data**: Per the project memory `feedback_youtube_clicks_not_tracked`, append-mode click tracking cannot capture clicks on youtu.be destinations because the email tracker only rewrites links to the tracked domain. W1-W4 had a TRUE click rate we couldn't measure. W5 routes through belgium.musicalbasics.com/no-school-today (a thin embed-plus-CTA page deployed today, commits `177f8c8` and `3ad6f28` on belgium-concert-landing-page) which the existing dp-analytics-beacon tracks automatically. So W5 is the first wave where unique clickers will appear in subscriber_events for this campaign.

**Audience**: Active Gmail subscribers tagged `done-belgium-followup-b`, NOT Test Account, NOT Bounced, NOT tagged `done-no-school-today` (excludes W1+W2+W3+W4 = ~1,990 recipients), NOT in the 480 C1 final. Eligible pool 1,129 (down from W4's 1,629 since W4 took 500), 500 picked with fresh shuffle (seed `20260524085`), split 250/250 disjoint. Tagged `done-no-school-today` after schedule.

**Also fired**: Two test sends (8 Test Accounts each) so user could preview both body variants in inbox. Test children `57ec6cea-6902-4bdd-bf52-8aacbb2a5389` (control body) and `f51ef715-f0a8-46c5-9379-cc755be23b75` (click-opt body) are pre-fired and not part of this audit.

**Audit at**: `2026-05-24T09:02Z`, ~23 min before Arm A fire. Setup ran at `08:59Z`, schedule fired at `09:03Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: subjects identical between A and B as designed; html_content DIFFERS (Arm B is 1,095 chars longer due to the repeated CTA block); Arm A html has 3 `belgium.musicalbasics.com/no-school-today` hrefs (logo, image, primary CTA), Arm B has 4 (logo, image, primary CTA, repeated CTA); ZERO `youtu.be/` hrefs in either child; em-dash count = 0 on both html_content and subject_line; 0 overlap with C1 final 480; 0 overlap with done-no-school-today cohort; throttle headroom ~75% (225s of 300s maxDuration); both children clean (status=draft, scheduled_status=null, sent_history=0 pre-fire).

**Outcome**: TBD. Both arms fire at 09:25Z / 09:30Z (~05:25 AM / 05:30 AM ET Sunday). Honest signals at 24-48h:
- Per-arm UNIQUE CLICK RATE (Gmail). This is the headline metric for W5 because both arms now route through a tracked landing page. First C2 wave with real click data.
- Per-arm OPEN rate (Gmail). Same subject + same visual frame between arms, so opens should be similar (any open delta is preheader / first-paragraph copy length artifact).
- Per-arm UNSUBSCRIBE rate. Watching whether the click-optimized "I want to know what you think" close changes unsub behavior vs the longer reflective close.

Master log appended with 500 more rows. New HTML files committed under _work (gitignored).

---

## 2026-05-24 late evening, Campaign 2 wave 4: 250/250 SUBJECT A/B continuation (Send 17 + Send 18)

**Planned**: W3 subject A/B continuation. Same designed Style 1 HTML (byte-identical), same control + new subjects, fresh 500 Gmail audience. Goal: pool W3 + W4 for a 500/500 subject read on top of the 250/250 W3 alone. Arm A child `75c5e7c8-c143-419a-9cf5-c2b704f9515e` at `2026-05-24T04:53:00Z` (control subject "I just finished a piece I started writing 20 years ago"). Arm B child `83f8b78c-42b5-4db8-9049-a5e2c7a9923b` at `2026-05-24T04:58:00Z` (new subject "My first new piece in 8 months"). Sender lionel@musicalbasics.com, append-mode click tracking.

**Audience**: Active Gmail subscribers tagged `done-belgium-followup-b`, NOT Test Account, NOT Bounced, NOT tagged `done-no-school-today` (excludes W1+W2+W3 = 1,490-ish recipients), NOT in the 480 C1 final. Eligible pool 1,629 (down from W3's 2,129 since W3 took 500), 500 picked with fresh shuffle (seed `20260524043`), split 250/250 disjoint. Tagged `done-no-school-today` after schedule.

**Also fired**: Two test sends (to 8 Test Accounts each) before the production drafts so user could preview both subject variants in inbox. Test children `10be9fb3-762e-4cbc-aee9-ef5c8eb0b0d6` (control) and `63fadbd6-aacb-426e-b0db-fc5ba439972f` (new) are pre-fired and not part of this audit.

**Audit at**: `2026-05-24T04:48Z`, ~5 min before Arm A fire. Setup ran at `04:45Z`, schedule fired at `04:49Z`. Schedule times bumped from initial 04:43/04:48 to 04:53/04:58 because setup took longer than expected (test sends + 4 clones consumed the original 30-min window).

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: subjects match manifest and differ between arms (no em dash in either); HTML byte-identical between arms (8,825 chars) and byte-identical to source file; sent_history rows = 0 on both production children (no leakage from setup, test children at 8 rows each as expected); `subscriber_ids` of 250 on each; 0 overlap with C1 final 480; 0 overlap with W1+W2+W3+initial-NST done-no-school-today cohort. Throttle headroom ~75%. D. DB UNIQUE constraint applied (verified in prior audits, code 23505).

**Outcome**: TBD. Both arms fire at 04:53Z / 04:58Z (~12:53 AM / 12:58 AM ET Sunday). Honest signal at 24-48h. After W4 matures, pooled W3+W4 will give 500-recipient samples per subject (control vs new), enough to call the subject-line winner without the n=250 noise that affected W3 alone.

Master log appended with 500 more rows.

---

## 2026-05-24 late evening, Campaign 2 wave 3: 250/250 SUBJECT A/B (Send 15 + Send 16)

**Planned**: First subject-line A/B for Campaign 2. Holds HTML constant (designed Style 1, the same HTML used in W1+W2 Arm A) and varies subject only. Arm A child `3028b13e-aaef-4e28-840a-56e6a533cf09` at `2026-05-24T03:08:00Z` carries the control subject "I just finished a piece I started writing 20 years ago" (same as W1+W2). Arm B child `8e42a918-0e0d-422d-bb57-131c7e0a593c` at `2026-05-24T03:13:00Z` carries the new subject "My first new piece in 8 months" (recency/scarcity framing). 250 Gmail recipients per arm, sender lionel@musicalbasics.com, append-mode click tracking.

**Choice rationale**: Style for W3 set to designed (Style 1) rather than plain (Style 2). Wave 1+2 pooled at 31h showed plain edged designed by ~3-5pp Gmail opens but 2/2 C2 unsubs came from the plain arm. User accepted the small open-rate edge in exchange for zero unsub exposure on this wave. Subject A/B isolates a different lever (recency framing vs time-investment framing) without confounding design.

**Audience**: Active Gmail subscribers tagged `done-belgium-followup-b`, NOT Test Account, NOT Bounced, NOT tagged `done-no-school-today` (excludes W1 and W2 recipients), NOT in the 480 C1 final (Send 9 + Send 10). Eligible pool 2,129, 500 picked with fresh shuffle (seed `20260524025`), split 250/250 disjoint. Tagged `done-no-school-today` after schedule.

**Audit at**: `2026-05-24T03:00Z`, ~8 min before Arm A fire. Setup ran at `02:58Z`, schedule fired at `03:03Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor explicitly verified: subject_line column on each child matches the manifest (A=control, B=new); HTML byte-identical between arms at 8,825 chars confirming HTML is held constant; zero em dash in either html_content or subject_line; 0 overlap with C1 final (480); 0 overlap with the 990 live `done-no-school-today` cohort; D. DB UNIQUE constraint probed live and confirmed firing (`sent_history_campaign_subscriber_unique`, code 23505). Throttle headroom ~75% (225s of 300s maxDuration). 5-min gap between arms covers Arm A wall-clock + concurrency-lock release.

**Outcome**: TBD. Both arms fire at 03:08Z / 03:13Z (~11:08 PM / 11:13 PM ET Saturday). Honest signal at 24-48h:
- Per-subject Gmail open rate: control vs new. Direct comparison since HTML is constant.
- Unsub deltas, watching whether plain-style asymmetry from W1+W2 was about plain HTML or about the subject (this controls for HTML, so any unsub delta is subject-attributable).

Master log appended with 500 more rows.

---

## 2026-05-23 early morning, Campaign 2 wave 2: 250/250 designed vs plain A/B (Send 13 + Send 14)

**Planned**: Second Campaign 2 wave, same A/B variable as wave 1 (Style 1 designed dark-themed HTML vs Style 2 minimal plain Gmail-style HTML). 250 Gmail subscribers per arm. Arm A child `cf945124-3dba-49c2-be91-7d928a3bacbb` at `2026-05-23T05:52:00Z`. Arm B child `c3562c95-f1cf-4960-bbd4-1ef72f314e13` at `2026-05-23T05:57:00Z`. Same subject "I just finished a piece I started writing 20 years ago", sender lionel@musicalbasics.com, append-mode click tracking. Goal: pool wave 1 + wave 2 to get a 500/500 design-vs-plain comparison with more statistical power than wave 1 alone (wave 1 9.5h opens were 60 vs 70, too close to call).

**Audience**: Active Gmail subscribers tagged `done-belgium-followup-b`, NOT Test Account, NOT Bounced, NOT tagged `done-no-school-today` (i.e. didn't receive wave 1), NOT in the 480 Send 9 / Send 10 (Campaign 1 final yesterday). Eligible pool 2,629, 500 picked with fresh shuffle (seed `20260523052`), split 250/250 disjoint. Tagged `done-no-school-today` after schedule.

**Audit at**: `2026-05-23T05:33Z`, ~19 min before Arm A fire. Setup ran at `05:32Z`, schedule fired at `05:36Z`.

**Verdict**: `SAFE`. No findings, no blockers. All standard sections PASS. Live-DB verification confirmed: both children 250 subscriber_ids each, 500/500 active Gmail, 0 Test Account, 0 Bounced, A∩B=0, A∩(Send9∪Send10)=0, B∩(Send9∪Send10)=0, A∩wave1-recipients=0, B∩wave1-recipients=0. Throttle math (250 × ~900ms ≈ 225s vs 300s maxDuration) at ~75% utilization. **H. HTML em-dash purity: PASS** (both children verified zero em dashes; source HTML files unchanged from wave 1 and re-verified).

Two cosmetic mismatches in the audit framing (throttle was described as 950ms/recipient when actual is 200ms throttle + ~700ms latency = ~900ms; wave 1 tag universe described as 494 when actually 500). Auditor flagged both as immaterial to safety. Same shape as wave 1, which executed cleanly.

**Outcome**: TBD. Both arms fire at 05:52Z / 05:57Z (~01:52 AM / 01:57 AM ET). Honest signal at 24-48h elapsed:
- Pooled wave 1 + wave 2 designed vs plain Gmail open rate: 500/500 comparison.
- Total Gmail unsubscribes across wave 2 (wave 1 was 2/500 = 0.4%, normal).

Master log [_work/no-school-today-audience-log.csv](../_work/no-school-today-audience-log.csv) appended with 500 more rows.

---

## 2026-05-21 evening, Campaign 2 wave 1: 250/250 designed vs plain A/B (Send 11 + Send 12)

**Planned**: First Campaign 2 ("No School Today" composition announcement) production wave. 250 Gmail subscribers per arm. Arm A is the designed dark-themed HTML (Variant B visual language with composition content), child `60f0a5ba-5892-4660-8a0e-e7d906a766ac` at `2026-05-22T00:05:00Z`. Arm B is the minimal plain Gmail-style HTML, child `fbede858-5cd5-4efb-a9d8-0b70e64337ad` at `2026-05-22T00:10:00Z`. Same subject "I just finished a piece I started writing 20 years ago", sender lionel@musicalbasics.com, append-mode click tracking. The A/B variable is HTML design only.

**Audience**: 500 Gmail subscribers tagged `done-belgium-followup-b` (received Variant B in some prior wave), excluding the 480 just queued for Campaign 1 final. Pool of ~3,129 candidates Gmail, 500 picked with fresh shuffle, split 250/250 disjoint. Tagged `done-no-school-today` (new) after schedule for future de-duplication.

**Audit at**: `2026-05-21T23:33Z`, ~32 min before Arm A fire.

**Verdict**: `SAFE`. No findings, no blockers. Throttle (250 × ~950ms ≈ 238s vs 300s maxDuration) at 79% utilization, comfortable. **H. HTML em-dash purity: PASS** (both children verified zero em dashes after user feedback on the prior draft). All other sections PASS.

**Outcome**: TBD. Both arms fire within the next ~40 min. Honest signal at 24-48h elapsed:
- Style 1 (designed) vs Style 2 (plain) Gmail open rate, comparing whether plain-text "personal email" feel hits Primary tab better than designed marketing-style HTML.
- Total Gmail clicks across both arms as the practical "did this get any human engagement" check.

Master log [_work/no-school-today-audience-log.csv](../_work/no-school-today-audience-log.csv) seeded with 500 rows, one per (recipient, send event).

---

## 2026-05-21 late afternoon and evening, Campaign 1 FINAL 240+240 (Send 9 + Send 10)

**Planned**: Final Campaign 1 cleanup. Two children of 240 Gmail subscribers each, both clones of Variant B parent `db10a687-...` with the personalization greeting patched in (winning variant from Send 7). Subject "My upcoming concert and livestream". Sender `Lionel Yu <lionel@musicalbasics.com>`, append-mode click tracking. Send A child `20eea907-428d-4e17-b894-2f8b5ca0a2d6` at `2026-05-21T21:00:00Z`. Send B child `a37cc569-8136-431e-bf88-aac6b56c603d` at `2026-05-21T22:00:00Z`. Hour-apart stagger. 

**Audience**: 480 Gmail subscribers eligible (active, not Test Account, not Bounced, not yet tagged `done-belgium-followup-b`). Shuffled deterministically, split 240/240 with explicit overlap assertion. All 480 tagged `done-belgium-followup-b` after schedule. This is the last cohort of Campaign 1; pool of untagged-B subscribers now zero. Full active list is now 100% tagged followup-b.

**Audit at**: `2026-05-21T20:05Z`, ~55 min before Send A fire.

**Verdict**: `SAFE`. No findings, no blockers. All standard sections PASS. Throttle math (240 × ~950ms ≈ 228s vs 300s maxDuration) puts utilization at ~76%, comfortable. HTML patch path proven from Send 8 + Send 7. Concurrency lock with 1-hour stagger gives Send A plenty of time to complete (~4 min real wall-clock) before Send B's sleepUntil expires.

**Outcome**: TBD, fires at 21:00Z / 22:00Z this evening. Will append maturity stats to `docs/CAMPAIGN-1-RESULTS.md` once data is in.

**Notes**: The two prior A/B experiments (Send 7 personalization, Send 8 revival) have fully matured. Mature results:
- Send 7A (personalized): 105 / 300 = **35.0%** Gmail opens, 2 clicks. Send 7B (un-personalized): 86 / 300 = **28.7%** Gmail opens, 2 clicks. Personalization adds **+6.3pp opens, tied clicks**.
- Send 8A (Variant A revival to non-openers): 39 / 214 = **18.2%** Gmail opens, 0 clicks. Send 8B (Variant B fresh to non-openers): 58 / 209 = **27.8%** Gmail opens, 0 clicks. Fresh subject beats re-send by **+9.6pp opens** on cold audience.

Both findings informed the Campaign 1 final variant choice (personalized + livestream subject). Full results write-up in [docs/CAMPAIGN-1-RESULTS.md](CAMPAIGN-1-RESULTS.md).

---

## 2026-05-16 early morning, 250/250 Gmail revival A/B (Send 8)

**Planned**: 250 + 250 Gmail re-engagement A/B against a clean audience class.

**Audience filter (clean re-engagement)**: Active Gmail subscribers who (a) received at least one "After years of work, two things are finally happening" campaign, (b) are NOT tagged `done-belgium-followup-b` (have never been touched by ANY Variant B follow-up wave, covers both "livestream" subject and the earlier May 8-9 Variant B sends with different subjects), and (c) have zero open events across either cohort. **641 candidates total → 500 picked, 250 per arm.** Many of these recipients are likely 2026-05-03 redirect-mode bulk-flag victims whose original Variant A copy never reached their inbox.

**Notable**: 100% of the clean audience is Gmail. Non-Gmail recipients of "After years of work" who hadn't opened it have ALL since been touched by some Variant B follow-up (the non-Gmail pool exhausted during Sends 1-6). So the clean re-engagement pool is Gmail-only by side effect of prior tagging.

**Arm A**: Variant A parent (`b04a217d-...`), subject "After years of work, two things are finally happening", body unchanged. Child `57ecce8e-6c9d-48a5-be87-92c5e08cc163`. The exact email these recipients didn't open before.

**Arm B**: Variant B parent (`db10a687-...`), subject "My upcoming concert and livestream", with `<p>Hi {{first_name}},</p>` greeting paragraph patched in. Child `bb463621-9ecf-4c18-9534-69e45ee658bf`. First time these recipients see this content.

**Audit at**: `2026-05-16T05:28Z`, ~30 min before the original scheduledAt.

**First-pass verdict**: `NEEDS_REVIEW`. The auditor flagged:

| Finding | Detail |
|---|---|
| **B. Throttle headroom, FAIL** | Original draft was 400 per arm. 400 × ~1050ms ≈ 420s vs 300s `maxDuration`. Auditor recommended truncating to ≤ 250 per arm. |
| **Re-targeting concern** | 587 of original 800 (73%) were already tagged `done-belgium-followup-b`. Surfaced as a CLAUDE.md rule deviation. |
| All other sections | PASS, idempotency, concurrency lock, DB constraint, HTML state (Arm B greeting patched correctly, Arm A no double-personalization despite Variant A's built-in `{{first_name}}`), A/B disjointness all verified directly against the live DB. |

**Resolution (before fire)**:
1. **Truncated to 250 per arm** per auditor recommendation. Each child ~225s within maxDuration, both arms fire on-schedule with no retry-cycle noise.
2. **Tightened audience to "received_A AND NOT tagged done-belgium-followup-b"**, strict re-engagement filter. Dropped from 800 to 500 recipients across a cleaner pool (641 candidates). Re-targeting concern resolved: no one in the final 500 has been touched by any Variant B follow-up.
3. Drafts updated in-place via direct Supabase UPDATE of `variable_values.subscriber_ids` rather than re-cloning, so the existing test sends and pre-vetted HTML state remained valid.

**Time slip during execution**: Scheduled values were `2026-05-16T06:00:00Z` (Arm A) and `06:05:00Z` (Arm B). The conversation paused ~70 minutes between final approval prompt and user's "go" confirmation, so by the time the `/send` calls fired both scheduledAt values were in the past. Inngest's `step.sleepUntil` with a past Date resolves immediately, so the two arms fired back-to-back via the concurrency lock starting `~2026-05-16T06:39Z`. Effective fire times: Arm A ~06:39Z (≈ 2:39 AM EDT), Arm B ~06:43Z. Still in the overnight engagement bucket; not a deliverability concern.

**Outcome (delivery)**: Both campaigns completed cleanly. Arm A delivered **214 / 250** (`57ecce8e-...`); Arm B delivered **209 / 250** (`bb463621-...`). **77 recipients (~15%) were filtered out at send-time** by send-stream's `status="active"` filter at [app/api/send-stream/route.ts:199](../app/api/send-stream/route.ts#L199). The most plausible cause: some recipients became `unsubscribed` between manifest build (2026-05-15 evening) and send (2026-05-16 06:39-06:43Z). This is a non-trivial gap on a re-engagement audience, these 500 had already received the bulk-flagged Variant A copy weeks earlier; Gmail List-Unsubscribe header processing may have flipped some of them. Note that those 77 recipients ARE still tagged `done-belgium-followup-b` (the bulk-tag step ran before send-stream filtered them) so they won't be re-targeted in this rotation. Net: 423 emails out, 87% of the planned 500.

**Outcome (engagement)**: TBD. Honest signal will be Gmail open rate at 24-48h elapsed. Hypothesis: the Variant A arm should show a recovery effect (recipients who never saw the bulk-flagged original get a clean inbox delivery this time); Variant B is testing whether a fresh subject reaches them better.

### Lessons recorded

- **Time-slip risk on tight-window scheduling**: A 70-minute pause between final-approval prompt and user's "go" confirmation pushed the `scheduledAt=06:00Z` value into the past. Inngest's `step.sleepUntil` with a past Date resolves immediately, so the send fired ~40 min later than planned. No deliverability harm (the late-night/overnight window is actually one of our strongest in the time-of-day analysis), but the planned vs effective fire diverged. **Process fix**: before calling `/send` on a draft, the scheduler script should compare `scheduledAt` to current time and either (a) refuse to schedule with a past value, (b) auto-bump to `now() + min_lead`, or (c) require an explicit `--allow-past-fire` flag. The agent API itself could enforce the same. Until that lands, when approving a tight-window send, the conversation should confirm time within the last few minutes of the actual `/send` call, not at audit-pass time.
- **Active-status attrition between manifest and send**: 15% of a re-engagement audience was filtered out at send-time because subscribers became inactive between when we picked them (manifest build, T-12h) and when send-stream ran (T-0). For audiences of "people who didn't engage with prior sends," this attrition rate is much higher than for fresh audiences (Sends 1-6 saw <2% attrition). **For the spreadsheet to match what actually shipped**, regenerate the audience CSV after the send completes, filtered to subscribers who actually have a `sent_history` row for the child. Or accept that the planned-vs-actual gap is real and informative ("X% of non-openers unsubscribe before we re-engage them"). The dropped 77 are still tagged `done-belgium-followup-b` so they won't be re-picked, but if the user wants to re-target them on the way back to active, they'd need to drop the tag first.
- **The auditor caught a real-cost mistake**: First time the audit returned `NEEDS_REVIEW` and the fix mattered. The 400/400 path would have shipped, completed via idempotency retry, but generated 4 "error"-marked `send_logs` rows and shifted Arm B's fire by ~10 minutes. The truncation to 250 per arm + audience tightening took ~5 minutes total and saved ~30 minutes of operator confusion + log noise reading. Validates keeping the audit as a hard gate, not an optional check.

---

## 2026-05-15 afternoon, 300/300 Gmail A/B personalization test (Send 7)

**Planned**: 300 Gmail recipients per arm, split from a single random shuffle, both clones of the un-personalized Variant B parent template `db10a687-...`. Arm A (personalized, child `3c85a846-4886-48c2-a25d-77e97a9b5fb3`) gets a `<p>Hi {{first_name}},</p>` greeting paragraph re-inserted via direct supabase UPDATE to the child's `html_content` before scheduling. Arm B (un-personalized, child `706ee826-ce55-4e51-83c4-d77b5c0b6895`) inherits the parent's no-greeting state. ScheduledAt: `2026-05-15T19:05Z` / `2026-05-15T19:10Z`. Resolves the personalization-affects-click-rate hypothesis from Send 4's 1-click outcome.

**Audit at**: `2026-05-15T18:00Z`, ~1h before fire.

**Verdict**: `UNSAFE` on first pass → `SAFE` after fix → ran.

### Section-by-section findings

| Section | First pass | After fix |
|---|---|---|
| A. Idempotency | PASS | PASS |
| B. Throttle headroom | PASS | PASS, 300 × ~900ms ≈ 270s vs 300s maxDuration. Tight (90% utilization); flagged but acceptable because idempotency makes any retry a no-op for already-sent recipients |
| C. Concurrency lock | PASS | PASS |
| D. DB UNIQUE constraint | PASS | PASS |
| E. Audience query | PASS | PASS, Gmail-only filter on top of done-tag + Test Account exclusion; 600-cap |
| E2. scheduledAt freshness | PASS | PASS, T+65m / T+70m |
| F. Rotation safety | PASS | PASS |
| G. State guards | PASS | PASS |
| H. HTML patch correctness | **FAIL** | PASS (after fix) |
| I. A/B integrity | PASS (conditional on H) | PASS |

### Blocker caught and fixed before send

**H. HTML patch indentation mismatch.** The script's `FIND` / `REPLACE` constants used 18-space + 20-space indentation for the `<p>` and inner text, but the live parent template's HTML uses 14-space + 16-space indentation. The mismatch came from my prior visual inspection, earlier diagnostic scripts that printed the HTML pre-padded each line with 4 spaces for terminal readability, so the visible indentation was 4 spaces deeper than the actual stored content. The auditor caught this by reading the live parent and counting bytes; the pre-flight check at `addGreetingToChild` would have aborted the whole script before any side effects (no test send, no clone, no schedule), but with no positive output the test wouldn't have run either.

**Fix**: dedented both `FIND` and `REPLACE` constants by 4 spaces ([_work/ab-test-personalization-300-300.ts:48-58](../_work/ab-test-personalization-300-300.ts)). Dry-run via `_work/dryrun-patch.ts` confirmed: 1 FIND occurrence in the parent, single greeting in the patched result, html length grew by exactly 195 chars (matching what we removed on 2026-05-13). After the fix the production script ran cleanly: test sends went out, arm A's child was patched correctly, both children scheduled.

### Lessons recorded

- **Pre-padded HTML dumps are a debugging trap.** When inspecting HTML stored in a JSONB / TEXT column via a diagnostic script that pretty-prints with indentation prefix, the visible whitespace is NOT the source-of-truth whitespace. The auditor now reads the column directly without printing, and counts bytes. Future scripts touching template HTML should use a regex-based patch (whitespace-tolerant) or a byte-count probe before committing the exact-string FIND. The current script's `addGreetingToChild` has the right safeguards (anchor-must-exist + post-patch validation); the fix was to the constant strings only.
- **Auditor caught a real bug.** First time the audit returned anything other than SAFE on first pass. Worked exactly as intended, read-only investigation found a content issue that pre-flight checks in the script would have caught at runtime, but at the cost of a fully-aborted run with no test output.

### Outcome

Tests fired immediately to 8 Test Accounts:
- Un-personalized test child: `144980e8-dd9d-4401-8f8d-44498fe1f0ee`
- Personalized test child: `816c7c09-094d-44ac-b725-a9e6ea49bdbc`

Production scheduled, 600 tagged. Pool after fire: Gmail **980** / non-Gmail 0.

A/B results TBD, fires at 19:05Z / 19:10Z. The mature comparison will be: Arm A (personalized) Gmail click rate vs Arm B (un-personalized) Gmail click rate. Combined with Send 4 / Send 5 / Send 6 prior data points, this gives n=300 per condition at this single send + cross-send aggregation.

---

## 2026-05-15 morning, 199 Gmail + 199 non-Gmail mixed final batch (Send 6)

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
- `_work/schedule-250-250.ts:138`, child name was hardcoded `"250 Gmail @ ..."` even though `nonGmailPicks.length` was already dynamic at :165. Updated Gmail to also use `${gmailPicks.length}` for symmetry. Future runs at any SAMPLE_SIZE label correctly.

**Pool watch (after this send fires)**:
- Gmail eligible: 1,580 (was 1,779, minus 199 picked)
- non-Gmail eligible: **0** (was 199, minus 199 picked), pool exhausted
- Total eligible for future sends in this rotation: 1,580 Gmail-only

**Outcome**: TBD, fires at 13:15Z / 13:20Z. Will record Send 6 stats once mature, alongside aggregate Sends 5+6 (the two un-personalized data points) vs Sends 1-3 (personalized) to nail the personalization-click-rate hypothesis.

---

## 2026-05-15 early morning, 250 Gmail + 250 non-Gmail Variant B (Send 5)

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

**Pool watch**: After Send 5 fires, pool drops to Gmail 1,779 / non-Gmail **199**. The next send (Send 6) is the point where non-Gmail can no longer support a 250 split, Send 6 will be the 199 non-Gmail + 199 Gmail mixed final batch, or Gmail-only from here on.

**Outcome**: TBD, fires at 10:25Z / 10:30Z. Honest Gmail-only figures will be appended after maturity.

---

## 2026-05-13 afternoon, 250 Gmail + 250 non-Gmail Variant B (Send 4)

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

**Pool watch**: non-Gmail pool now 699 (was 1,199 at the start of the rotation). At 250/send, it exhausts in ~3 more sends, well before the Gmail pool (2,029 remaining). After non-Gmail is depleted, future sends will either need to be Gmail-only or merge the remaining audiences.

**Outcome**: TBD, fires at 18:50Z / 18:55Z. Stats and Gmail-only honest figures appended after maturity.

---

## 2026-05-13 early morning, 250 Gmail + 250 non-Gmail Variant B

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

- Stale doc-comment in `_work/schedule-250-250.ts:1-10` referencing "600ms throttle, no concurrency lock", code is current, comment is not. Cosmetic only; flagged for cleanup after the send.
- Throttle headroom (75s) is comfortable but not enormous. If Resend p99 latency spikes past ~1000ms per call, a 250-recipient run could brush the 300s ceiling. Watch for retries in Inngest dashboard after the fire.

### Outcome

TBD, children fire at 09:50Z / 09:55Z. Stats and Gmail-only honest figures will be appended after the send matures.

### Lessons recorded

None new this run. The audit ran clean against the post-incident
codebase, which is the point of the audit log: zero-finding entries
confirm the protections continue to hold.

---

## 2026-05-12 evening, 250 Gmail + 250 non-Gmail Variant B

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

1. **Stale `scheduledAt` constants in scheduler script**. `_work/schedule-250-250.ts` lines 27-28 still hardcoded `2026-05-12T02:25:00Z` / `02:30:00Z` from the prior night's run. Both times were already in the past. `step.sleepUntil` with a past `Date` fires immediately, the two children would have fired back-to-back at run time, NOT at the intended 21:25Z / 21:30Z slot. **Fix**: updated the two constants to `21:25:00Z` / `21:30:00Z` before invoking the script. **This is the kind of bug the auditor exists for.** A naïve "run the same script that worked last time" would have re-sent immediately and likely tripped the Resend rate limit during the response window.

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
  - 100% of clicks from "Other"-bucket domains (`.edu`, `.gov`, law firms, medical, corporate) on 2026-05-12 fired within 5 minutes of send, often 2-3 clicks per recipient. These are inbound URL-safety scanners (Mimecast, Proofpoint, Microsoft SafeLinks, etc.), not humans.
  - **Gmail metrics are the only reliable engagement signal.** Gmail's image proxy doesn't pre-fetch; Gmail tabs don't pre-click. Stable Gmail open rate ~30%, Gmail click rate ~0.8% on this audience.
  - Apple click rate, when non-zero, is also a real human signal (MPP doesn't follow links) but the sample is tiny.
  - When comparing subject lines or sends, only compare Gmail rates. Non-Gmail rates measure scanner aggressiveness, not human interest.
