# Session Handoff, 2026-05-22

State at end of this session. Read this first. Successor to `docs/SESSION-HANDOFF-2026-05-12.md`.

## TL;DR

**Campaign 1 (Belgium concert + masterclass) is 100% done.** Every active reachable subscriber (5,644) has been touched. Audience pool exhausted. All A/B tests fully matured and documented.

**Campaign 2 (No School Today composition announcement) wave 1 just scheduled.** Two arms of 250 Gmail each (designed vs plain HTML, same subject), firing imminently at `2026-05-22T00:05Z` (Arm A designed) and `00:10Z` (Arm B plain).

**Concert is 2026-06-11**, ~20 days away. Plenty of runway for more Campaign 2 waves and a possible final Campaign 1 re-target before the date.

**Em dash rule enforced.** Memory: `feedback_no_em_dashes.md`. Bulk-cleaned across SEND-AUDIT-LOG, CAMPAIGN-1-RESULTS, CLAUDE.md, incident doc, and prior session handoff. SENDS-INDEX.md still has em dashes inherited from DB campaign names (regenerates fresh from script).

## What's scheduled imminently, DO NOT CANCEL WITHOUT INTENT

**Campaign 2 wave 1 (No School Today):**

| Arm | Child | Fires UTC | Fires EDT | Style |
|---|---|---|---|---|
| A | `60f0a5ba-5892-4660-8a0e-e7d906a766ac` | `2026-05-22T00:05:00Z` | 8:05 PM May 21 | Designed dark theme + YouTube hero thumbnail |
| B | `fbede858-5cd5-4efb-a9d8-0b70e64337ad` | `2026-05-22T00:10:00Z` | 8:10 PM May 21 | Plain Gmail-style minimal HTML |

Both: subject "I just finished a piece I started writing 20 years ago", sender `lionel@musicalbasics.com`, append-mode click tracking, 250 Gmail recipients per arm, no overlap. Variable being tested: HTML design only.

500 already tagged `done-no-school-today` (new tag for Campaign 2 tracking, distinct from `done-belgium-followup-b`). Master log [_work/no-school-today-audience-log.csv](../_work/no-school-today-audience-log.csv) seeded with 500 rows.

Audit verdict: SAFE on first pass.

## Campaign 1, fully saturated and closed

Final state:

| | Count |
|---|---:|
| Total active musicalbasics | 5,652 |
| Reachable active non-Test | 5,644 |
| Tagged `done-belgium-followup-b` | 5,644 (100%) |
| Tagged `done-belgium-masterclass` | 5,653 (100%) |
| Untagged remaining | 0 |
| Total sent_history rows generated | ~16,500 |

Sends 9 and 10 (Campaign 1 final, 240+240) fired earlier this evening at 21:00Z and 22:00Z covering the last 480 untagged-B Gmail subscribers using the winning variant (Variant B "livestream" subject + personalized greeting per Send 7 A/B winner).

## A/B test results, both mature, documented

### Send 7 (May 15) personalization on/off

| Arm | Gmail open | Gmail clicks |
|---|---:|---:|
| Personalized | **35.0%** | 0.7% (2 of 300) |
| Un-personalized | 28.7% | 0.7% (2 of 300) |
| **Delta** | **+6.3pp opens** | tied |

Finding: personalization (Hi {first_name},) lifts inbox attention via the preview snippet but does not change click intent.

### Send 8 (May 16) Variant A revival vs Variant B fresh, against non-openers

| Arm | Gmail open | Gmail clicks |
|---|---:|---:|
| Variant A revival ("After years of work") | 18.2% | 0 |
| Variant B fresh ("livestream") | **27.8%** | 0 |
| **Delta** | **+9.6pp opens for fresh subject** | tied at 0 |

Finding: fresh subject reaches non-openers better than re-sending the email they previously ignored. Variant A re-send still recovered to 18.2% (confirming many May 3 bulk-flag victims literally never saw the original) but the fresh angle hit harder.

## Conversion attribution

4 confirmed paid orders in `concert_tickets.ticket_orders` as of last check:

| Order | Buyer | On list? | Email-attributed? |
|---|---|---|---|
| #7146 Matthieu Menet | matthieumenet@hotmail.com | NO | Direct/social/external |
| #7121 Alain Zawada | goldensniper2@hotmail.com | NO | Direct/social/external |
| #7113 Bart | hoogh.b@2college.nl | yes | YES, clicked "After years of work" May 2 (4 opens, 4 clicks) |
| #7111 Jonathan Lavigne | jonathanlavigne@hotmail.com | yes | YES, clicked "After years of work" May 3 overnight |

50% of paid orders from email funnel. Both email-attributed buyers engaged with the "After years of work" subject before purchase. Neither bought after the Variant B follow-up wave.

## Pool status for Campaign 2

| Cohort | Count |
|---|---:|
| Active Gmail tagged `done-belgium-followup-b` | ~3,629 |
| Already sent Campaign 2 wave 1 (tagged `done-no-school-today`) | 500 |
| **Remaining Campaign 2 candidates** | **~3,129 Gmail** |

The 480 Campaign 1 final recipients (just hit with Variant B "livestream") were deliberately excluded from Campaign 2 wave 1 to avoid email fatigue. They're available for Campaign 2 wave 2 once they've had a few days breathing room.

## What was set up this session

### Documents created or substantially updated

- [docs/CAMPAIGN-1-RESULTS.md](CAMPAIGN-1-RESULTS.md), comprehensive prose results doc covering all 5 subject lines, both A/B experiments, send timing analysis, conversion attribution, honest-metric guidance, notable incidents
- [docs/CAMPAIGN-1-REPORT.pdf](CAMPAIGN-1-REPORT.pdf), 12-page PDF with charts (subject performance, A/B results, timeline, timing, provider breakdown, conversion funnel, key findings)
- [docs/SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md), audit entries for Send 9, 10, 11, 12 (all SAFE)
- [docs/SENDS-INDEX.md](SENDS-INDEX.md), tabular sends reference (regenerate with `npx tsx _work/build-sends-index.ts`)

### Em dash purge

User confirmed `feedback_no_em_dashes.md` rule with a strong correction. Bulk-replaced em dashes across:

- SEND-AUDIT-LOG.md (30 removed)
- INCIDENT-2026-05-12-gmail-double-send.md (17 removed)
- SESSION-HANDOFF-2026-05-12.md (23 removed)
- CLAUDE.md (6 removed)
- CAMPAIGN-1-RESULTS.md (created clean, then 3 caught in second pass)

Total: 79 em dashes removed. SENDS-INDEX.md still has ~73 from DB campaign names; not actionable until campaign-name normalization.

### Tags introduced

- `done-no-school-today`, new tag applied to recipients of any Campaign 2 send. Used to prevent re-sending Campaign 2 to the same recipient.

### Scripts created in _work/ (all gitignored, PII concerns)

- `campaign-1-final-build.ts`, builds + schedules Campaign 1 final 240+240
- `campaign-2-wave-1-setup.ts`, builds drafts + tests for Campaign 2 wave 1
- `schedule-campaign-2-wave-1.ts`, schedules existing Campaign 2 drafts
- `no-school-today-audience.ts`, computes Campaign 2 audience
- `no-school-today-style-1-designed.html`, the dark-themed Variant B-language template
- `no-school-today-style-2-plain.html`, the minimal Gmail-style template
- `build-campaign-1-report.py`, generates the PDF report (uses /tmp/report-venv)
- `campaign-1-status.ts`, audience landscape + A/B maturity check
- `audience-landscape.ts`, full audience cuts breakdown
- `analyze-time-of-day.ts`, send timing analysis

### Send pipeline state

All retry-safety protections from the 2026-05-12 incident remain live and have been working as intended:

- send-stream idempotency (pre-loop sent_history check + per-row insert)
- Inngest concurrency lock (`global-send-lock`, scope:"account", limit:1, shared across all 4 send functions)
- 200ms per-recipient throttle
- DB UNIQUE constraint on `sent_history(campaign_id, subscriber_id)`, verified applied
- send-safety-auditor subagent mandated before any send >= 50 recipients per CLAUDE.md

12 audited sends to date (Sends 1 through 12). Auditor caught real issues twice:
- Send 7: HTML patch indentation mismatch (would have aborted via in-script check anyway)
- Send 8: throttle headroom at 400/arm (would have triggered idempotency retry cycle)

Both caught before fire. Both fixed before fire.

## Open questions for next session

### When to check Campaign 2 wave 1 maturity

Campaign 2 wave 1 fires at `2026-05-22T00:05Z / 00:10Z`. Mature data window: roughly 24-48h after fire, so check around 2026-05-23 evening EDT through 2026-05-24.

The key comparison: Style 1 (designed) Gmail open rate vs Style 2 (plain) Gmail open rate. Hypothesis from email marketing literature: plain-text-looking emails hit Gmail's Primary tab more often, while designed marketing-style emails get routed to Promotions. So plain might win on opens even though designed looks more "polished."

If plain wins decisively: shift Campaign 2 wave 2+ to plain-style HTML for all subsequent sends.

If designed wins or ties: stick with designed for the brand consistency benefit.

### Campaign 2 wave 2 audience and timing

After wave 1 maturity:
- ~3,129 remaining Gmail candidates in the `done-belgium-followup-b` pool (excluding wave 1's 500)
- Plus the 480 Campaign 1 final recipients (give them ~3-5 days to breathe first)

Total reachable Campaign 2 audience pool after wave 1: ~3,609. Could split into 2-3 more waves of 500-1000 each.

### Pre-concert Campaign 1 re-target

The concert is 2026-06-11, about 20 days from now. A pre-concert urgency send to previously-tagged subscribers (a deliberate re-target of `done-belgium-followup-b`) might be worth doing in early June. Subject hooks could lean on "1 week until Belgium" or "last chance for tickets."

### Possible "engaged but didn't click" cohort send

Per audience landscape script: 1,648 unique openers of "After years of work" across the campaign. Most also got Variant B follow-up. A specific re-targeting of "opened both A and B but didn't click either" could be a high-leverage final push, since those people demonstrated interest but didn't convert.

## Things to know before scheduling another send

### Standing rules in CLAUDE.md

1. **MANDATORY**: spawn `send-safety-auditor` subagent before any send >= 50 recipients. Get SAFE verdict before scheduling. NEEDS_REVIEW or UNSAFE means fix-or-discuss, not fire.
2. Resend rate limit on this account: 5 req/s. 200ms throttle is the floor.
3. `clickTrackingMode: "append"` is the default. Never use `redirect` for bulk sends (Gmail bulk-flag risk).
4. Always run `date -u` before computing scheduledAt.
5. Stagger concurrent children by 5+ min OR rely on Inngest concurrency lock to serialize.
6. Exclude `Test Account` tag from real audiences.
7. Tag the audience after schedule with the campaign's idempotency tag (`done-belgium-followup-b` for Campaign 1, `done-no-school-today` for Campaign 2).

### Lessons learned this session

- **Conversation pause time-slip risk**: if the user takes more than ~15 min between final approval and "go", re-verify time and update scheduledAt. Send 8 fired ~40 min late because the user's "go" came after 70 min, leaving scheduledAt in the past.
- **Active-status attrition on re-engagement audiences**: 10-15% of "non-opener" audiences go inactive between manifest build and send. Build audience close to send time.
- **Em dashes are forbidden**: standing rule. Affects everything: emails, docs, audit log entries, commit messages. Use commas, periods, or rewrites.
- **HTML patch indentation must match live DB exactly**: my prior visual inspections used a diagnostic that pre-padded printed lines. Verify against bytes.
- **Variable_values must preserve subscriber_ids when patching**: don't overwrite, merge. The agent /send endpoint refuses with UNSAFE_SEND_BLOCKED if subscriber_ids is missing.

## File / ID reference

| Constant | Value |
|---|---|
| Email Supabase project | `quyqwdjygzalqqmrgkfk` |
| Concert Supabase project (do NOT use for email) | `szlagsmxgfsobizzxaog` |
| Variant A parent | `b04a217d-7855-447e-9b29-fa25b50802a0` |
| Variant B parent | `db10a687-4233-4313-8431-8d2fa64a15c4` |
| Campaign 2 Arm A draft (designed) | `60f0a5ba-5892-4660-8a0e-e7d906a766ac` |
| Campaign 2 Arm B draft (plain) | `fbede858-5cd5-4efb-a9d8-0b70e64337ad` |
| Done tags | `done-belgium-masterclass` (Variant A), `done-belgium-followup-b` (Variant B), `done-no-school-today` (Campaign 2) |
| Resend rate limit | 5 req/s |
| Vercel maxDuration | 300s |

## Key references

- [CLAUDE.md](../CLAUDE.md), project-level standing rules
- [docs/SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md), per-send audit findings, newest at top
- [docs/SENDS-INDEX.md](SENDS-INDEX.md), tabular sends reference
- [docs/CAMPAIGN-1-RESULTS.md](CAMPAIGN-1-RESULTS.md), Campaign 1 results write-up
- [docs/CAMPAIGN-1-REPORT.pdf](CAMPAIGN-1-REPORT.pdf), Campaign 1 PDF report with charts
- [docs/INCIDENT-2026-05-12-gmail-double-send.md](INCIDENT-2026-05-12-gmail-double-send.md), the double-send incident
- [docs/SESSION-HANDOFF-2026-05-12.md](SESSION-HANDOFF-2026-05-12.md), prior handoff (preserved)
- [.claude/agents/send-safety-auditor.md](../.claude/agents/send-safety-auditor.md), mandatory pre-send auditor

## What to do next

1. **Check Campaign 2 wave 1 maturity** around 2026-05-23 evening or 2026-05-24 morning. Pull Gmail open rate per arm via a quick script (model after `_work/check-ab-personalization.ts`). Compare designed vs plain.
2. Based on result, **schedule Campaign 2 wave 2** with the winning style (or both if results are inconclusive).
3. **Consider a pre-concert Campaign 1 re-target** in early June, leaning on urgency. Audience would be the 1,648 openers of "After years of work" who didn't convert.
4. If anything looks weird in any campaign, **always run safety auditor before adjusting**. The auditor has caught real issues twice and the discipline of running it every time is the entire reason for its existence.
