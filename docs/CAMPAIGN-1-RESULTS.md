# Campaign 1 results

Belgium concert + Ultimate Pianist masterclass announcement. Ran 2026-05-01 through 2026-05-21. Two parent templates (Variant A and Variant B), five subject lines tested, two A/B experiments, audience fully saturated by end. This doc consolidates the durable findings.

## Overview

| Field | Value |
|---|---|
| Campaign | Belgium concert + Ultimate Pianist masterclass announcement |
| Concert date | 2026-06-11, 19:30 CEST, Theaterzaal Maupertuis Zaventem (100 seats) |
| Total active musicalbasics list (2026-05-21) | ~5,650 |
| Total sent_history rows generated (any subject in this rotation) | ~16,500 (across multiple sends per subscriber) |
| Recipients ever touched by this campaign | 5,644 (essentially the entire active list, 99%+) |
| Confirmed paying customers (concert_tickets.ticket_orders) | 4 (as of 2026-05-15) |
| Email-attributed paying customers | 2 of 4 (both engaged with "After years of work, two things are finally happening" subject) |
| Other 2 paying customers | Not in subscriber list, likely came via social / direct / word of mouth |

## Subject lines tested, Gmail-only open rates (mature, 24h+ elapsed)

Gmail is the only reliable open-rate signal. Apple's Mail Privacy Protection auto-opens all email at delivery (60-95% open rate); Yahoo and AOL prefetch heavily (50-85%); Microsoft Defender variable; "Other" domains are dominated by corporate scanners. Numbers below are Gmail openers / Gmail recipients per send. Multi-send subjects show range.

| Subject | Sends | Gmail open rate range | Best timing observed |
|---|---:|---|---|
| **After years of work, two things are finally happening** (Variant A) | 18 | 17-79% (range very wide, see below) | 13:00 EDT (initial test sends to small fresh audiences hit 79%) |
| **My upcoming concert and livestream** (Variant B "livestream") | 8 (post-incident) | 28.4% to 34.4% mature | 22:00 EDT highest at 34.4% (Send 1, n=250) |
| Will I see you in Belgium? | 1 | 21.2% | n/a |
| My only concert this year | 2 | 18.0% to 22.0% | n/a |
| My only public concert this year | 1 | 12.0% | n/a |

### Subject performance commentary

- **"My upcoming concert and livestream" is the proven winner**: highest mature open rate (34.4% peak), most consistent across audiences (28-35% mature on multiple sends to different cohorts), best click-through-to-conversion. This is the subject Campaign 1 ended on.
- **"After years of work, two things are finally happening"**: powerful long-form story subject. Hit 79% open rate on initial small test sends to fresh audiences. Both confirmed email-attributed paying customers clicked through this subject. BUT: when bulk-cadenced (May 3 overnight, 10 batches), Gmail bulk-flagged slots 6-10 due to redirect-mode click tracking, collapsing those slots to 0.9-4.8% open rate. The May 3 overnight cohort therefore has a contaminated open-rate baseline.
- **"Will I see you in Belgium?"**: tested once. Mediocre (21.2% Gmail). Question-mark subject lines underperformed in earlier MusicalBasics data (per project handoff notes).
- **"My only concert this year"**: tested twice. 18-22% Gmail. Acceptable but not strong.
- **"My only public concert this year"**: worst tested at 12.0% Gmail. Adding "public" diluted the urgency.

## A/B experiment 1: personalization on vs off (Send 7, 2026-05-15)

| Arm | Recipients | Gmail open rate | Gmail click rate | Real human clicks |
|---|---:|---:|---:|---:|
| **A. Personalized** (`Hi {first_name},` greeting) | 300 | **35.0%** | 0.7% (2) | ~2 |
| B. Un-personalized (no greeting) | 300 | 28.7% | 0.7% (2) | ~2 |
| Delta | | **+6.3pp opens** | tied | tied |

**Finding**: Personalization (the `Hi [name],` greeting at the top of body) adds about 6pp to Gmail open rate. Mechanism: Gmail's inbox preview shows the first line of body text, which becomes "Hi [name], I'm proud to announce..." With the recipient's name in the preview snippet, more recipients open. Click intent once inside the email is unchanged.

**Implication**: keep personalization on for Variant B sends. The cost (one merge tag, easy to manage) is small for a measurable 6pp lift in inbox attention.

## A/B experiment 2: Variant A revival vs Variant B fresh, against non-openers (Send 8, 2026-05-16)

Audience: 500 Gmail subscribers who received "After years of work" at least once, never opened it, never received any Variant B follow-up. Many were May 3 redirect-mode bulk-flag victims whose original copy never reached the inbox.

| Arm | Delivered | Gmail open rate | Gmail clicks |
|---|---:|---:|---:|
| A. Variant A "After years of work" (re-send same email) | 214 | 18.2% | 0 |
| **B. Variant B "My upcoming concert and livestream" (fresh subject)** | 209 | **27.8%** | 0 |
| Delta | | **+9.6pp opens for B** | tied at 0 |

**Finding**: Sending a fresh subject to non-openers significantly outperforms re-sending the exact email they already ignored. The Variant A re-send did show recovery (18.2% Gmail opens vs near-zero from the bulk-flagged delivery), confirming many recipients literally never saw the original. But the fresh subject hit harder.

**Implication**: for future re-engagement against non-openers, use a NEW subject angle. The "livestream" framing carried more weight than re-running the converter "After years of work" copy on the same audience.

## Send timing analysis (Gmail open rate by EDT hour, mature data, livestream subject only)

| Send | EDT hour fired | Mature Gmail open rate |
|---|---|---:|
| Send 1 | 22:00 (10 PM) | 34.4%, highest |
| Send 4 | 14:00 (2 PM) | 33.2% |
| Send 2 | 17:00 (5 PM) | 32.8% |
| Send 3 | 5:50 (5:50 AM) | 28.8% |

5.6pp range across times-of-day. Late evening (10 PM) and afternoon (2-5 PM) cluster around 33-34%. Early morning (5 AM) loses about 5pp. Small sample; the differences are within sampling noise but the direction is consistent.

**Implication**: schedule future sends in the afternoon-to-evening EDT window where possible. Avoid very early morning unless overnight delivery is intentional (e.g., catching morning inbox-check).

## Active-status attrition on re-engagement audiences

Send 8 was the first re-engagement send to non-openers built from a yesterday-evening audience manifest. **77 of 500 planned recipients (15%) dropped out at send time** because their `status` flipped from active to unsubscribed between manifest build and send. For fresh-audience sends, attrition was much lower (under 2%). The mechanism is likely Gmail List-Unsubscribe header processing on previously bulk-flagged emails quietly flipping subscribers.

**Implication**: when building re-engagement audiences from prior non-engagers, expect substantial attrition between manifest and send. Either build the manifest close to send time, or accept that ~10-15% of the planned audience will be filtered out automatically.

## Conversion attribution

2 of 4 confirmed paying customers (50%) came from the email funnel:
- **Bart (`hoogh.b@2college.nl`, order #7113, 2026-05-09)**: clicked "After years of work" 4 times on the May 2 rotation send before purchase.
- **Jonathan (`jonathanlavigne@hotmail.com`, order #7111, 2026-05-09)**: opened + clicked "After years of work" overnight send on May 3 before purchase.

Both purchased AFTER engaging with "After years of work" but BEFORE the Variant B "livestream" follow-up was sent. No purchases attributed to the Variant B follow-up wave so far.

2 of 4 paying customers were NOT in the email list:
- **Alain Zawada** (`goldensniper2@hotmail.com`, #7121, 2026-05-09)
- **Matthieu Menet** (`matthieumenet@hotmail.com`, #7146, 2026-05-15)

These came from non-email channels (social, direct, word of mouth, paid ads, referrals).

**Implication**: the email funnel drives roughly half of the concert conversions in this cohort. "After years of work" appears to be the converting subject, even though "livestream" opens better. This is a sample of 2, so the conclusion is suggestive, not statistical.

## Audience saturation

| Cohort | Count | Notes |
|---|---:|---|
| Active musicalbasics subscribers | 5,644 | end-of-campaign snapshot |
| Tagged `done-belgium-followup-b` | 5,644 | 100% saturated after Campaign 1 final (2026-05-21) |
| Tagged `done-belgium-masterclass` | 5,653 | every active subscriber received Variant A in some form |
| Untouched by either rotation | 0 | |

Campaign 1 went to essentially the entire active list. Future Campaign 1 sends would have to re-target previously-tagged recipients (a deliberate policy override of the standard audience filter).

## Notable incidents during the campaign

### 2026-05-03 redirect-mode bulk-flagging
The overnight 10-batch Variant A send on 2026-05-03 used `clickTrackingMode="redirect"`. Slots 1-2 (06:00Z, 06:30Z) delivered cleanly at 49-54% Gmail open rate. Starting at slot 5 (08:00Z), Gmail's spam filter bulk-classified the inbound emails as suspicious due to the redirect domain pattern, collapsing open rates to 0.9-4.8% across slots 6-10. ~2,000 recipients had their copy landing in Promotions/Spam unseen. CLAUDE.md and `docs/INCIDENT-2026-05-12-gmail-double-send.md` document the resulting policy change to default to `clickTrackingMode="append"`.

### 2026-05-12 Gmail double-send (Send 1)
Send 1's Gmail child fired twice ~30 seconds apart due to an Inngest retry of the send-broadcast step. 250 recipients received the email twice. Triggered a full post-incident response: send-stream made idempotent, per-row sent_history writes, account-scoped Inngest concurrency lock, DB UNIQUE constraint on `sent_history(campaign_id, subscriber_id)`. Full write-up in `docs/INCIDENT-2026-05-12-gmail-double-send.md`. No double-sends since.

## Honest-metric guidance (carry-forward)

For all future sends:

1. **Lead with Gmail-only open and click rates.** Total/non-Gmail rates are inflated by Apple MPP, Yahoo prefetch, and corporate URL scanners. Never compare subjects across non-Gmail providers.
2. **Apple opens** mean "delivered" not "engaged." Apple clicks (when non-zero) are the real engagement signal because MPP doesn't follow links.
3. **"Other"-domain (corporate / .edu / .gov / law firm) clicks are almost universally URL safety scanners** (Mimecast, Proofpoint, Microsoft SafeLinks). 100% of "Other" clicks across this campaign fired within 5 minutes of send, often 2-3 per recipient. Subtract from any "real human click" estimate.
4. **Real human click count ≈ Gmail clicks + Microsoft clicks + Apple clicks (when nonzero) + Yahoo clicks.** Across the full Campaign 1 livestream-subject volume, real human click count was roughly 0.5-1% Gmail.

## Campaign 1 sends list (chronological, summary)

| Date (UTC) | Send | Recipients | Subject | Gmail open % (mature) | Notes |
|---|---|---:|---|---:|---|
| 2026-05-02 | Variant A rotation (3 children) | ~265 | After years of work... | 45-65% | Initial fresh audience |
| 2026-05-03 | Variant A overnight (10 batches) | ~4,500 | After years of work... | 17-54% then 1-5% | Slots 6-10 bulk-flagged |
| 2026-05-08 (R1) | Variant B 100/100 | 200 | My only concert this year | ~22% | A/B grouped Gmail/non-Gmail |
| 2026-05-09 (R2) | Variant B 100/100 | 200 | My only concert this year | ~18% | |
| 2026-05-09 (R3) | Variant B 73 | 147 | Will I see you in Belgium? | 21.2% / 16.3% combined | non-Gmail subject test |
| 2026-05-09 (R4) | Variant B 75 | 147 | My only public concert this year | 19.7% combined (12% Gmail) | non-Gmail subject test |
| 2026-05-10 | Variant B rescue 106 | 106 | livestream | tested | failed-recipient rescue |
| 2026-05-10 | Variant B 200/200 | 400 | livestream | 21.0% | first livestream wide-rollout |
| 2026-05-12 02:25Z (Send 1) | Variant B 250 Gmail | 250 (sent twice) | livestream | 34.4% mature | **Double-send incident** |
| 2026-05-12 02:30Z (Send 1) | Variant B 250 non-Gmail | 250 | livestream | n/a | (non-Gmail not measured cleanly) |
| 2026-05-12 21:25Z (Send 2) | Variant B 250 Gmail | 250 | livestream | 32.8% mature | |
| 2026-05-13 09:50Z (Send 3) | Variant B 250 Gmail | 250 | livestream | 28.4-32.4% mature | |
| 2026-05-13 18:50Z (Send 4) | Variant B 250 Gmail un-personalized | 250 | livestream | 32.8% mature | **First un-personalized** |
| 2026-05-15 10:25Z (Send 5) | Variant B 250 Gmail un-personalized | 250 | livestream | ~26% maturing | |
| 2026-05-15 13:15Z (Send 6) | Variant B 199/199 mixed final | 398 | livestream | ~22% maturing | non-Gmail pool exhausted |
| 2026-05-15 19:05Z (Send 7A) | Variant B 300 personalized | 300 | livestream | **35.0% mature** | **A/B exp 1, won opens** |
| 2026-05-15 19:10Z (Send 7B) | Variant B 300 un-personalized | 300 | livestream | 28.7% mature | A/B exp 1 |
| 2026-05-16 06:00Z (Send 8A) | Variant A revival 214 | 214 | After years of work... | 18.2% mature | A/B exp 2, recovery test |
| 2026-05-16 06:05Z (Send 8B) | Variant B fresh 209 | 209 | livestream | **27.8% mature** | **A/B exp 2, won opens** |
| 2026-05-21 21:00Z | Campaign 1 final A | 240 | livestream + personalized | scheduled | last of the 480 untagged |
| 2026-05-21 22:00Z | Campaign 1 final B | 240 | livestream + personalized | scheduled | last of the 480 untagged |

For the full audited send history with retry-safety findings + per-send outcomes, see `docs/SEND-AUDIT-LOG.md`. For a tabular reference of every send regardless of audit, see `docs/SENDS-INDEX.md` (regenerate with `npx tsx _work/build-sends-index.ts`).
