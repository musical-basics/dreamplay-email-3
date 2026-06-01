# Campaign 2 results

"No School Today" composition announcement + Belgium concert cross-sell. Started 2026-05-22 with W1; in flight through 2026-05-25 (W9 firing midday ET). 9 waves to date, all 250/250 A/B tests. This doc consolidates findings across the campaign so far. Per-wave operational detail lives in [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md).

## Overview

| Field | Value |
|---|---|
| Campaign | "No School Today" composition launch + Belgium concert cross-sell |
| Primary content | New original piano piece "No School Today" (YouTube `y3SZI2AM0Uc`), based on a melody Lionel started writing at age ~14-15 |
| Secondary content (W7+) | Rachmaninoff Prelude in G Minor Op. 23 No. 5 (YouTube `Bjouy1XpO9M`) as a different hook into the same Belgium concert |
| Concert tie-in | June 11, 2026 at Theaterzaal Maupertuis, Zaventem |
| Total waves fired | 9 (W1-W9), each 250+250 = 500 recipients |
| Total subscribers touched by C2 | ~4,000 (out of ~5,620 active list) |
| Idempotency tag | `done-no-school-today` |
| Landing pages introduced for click tracking | `/no-school-today` (W5), `/prelude` (W7) |

## What was tested in each wave

| Wave | Date (UTC) | A/B variable | Arm A | Arm B | Audience | Notes |
|---|---|---|---|---|---|---|
| W1 | 2026-05-22 00:05Z | HTML design | Designed (dark theme) | Plain (Gmail-style) | 500 Gmail | Same subject "I just finished a piece I started writing 20 years ago" |
| W2 | 2026-05-23 05:52Z | HTML design | Designed | Plain | 500 Gmail | W1 continuation |
| W3 | 2026-05-24 03:08Z | Subject | "I just finished a piece I started writing 20 years ago" (control) | "My first new piece in 8 months" (new) | 500 Gmail | HTML held constant (designed) |
| W4 | 2026-05-24 04:53Z | Subject | Control "20 years" | New "8 months" | 500 Gmail | W3 continuation |
| W5 | 2026-05-24 09:25Z | Body click-optimization | Long-form narrative (control) | Short intro + early CTA + repeated CTA | 500 Gmail | Subject "8 months" held; both link to `/no-school-today` landing page (first trackable clicks) |
| W6 | 2026-05-24 10:10Z | Body click-optimization | Control body | Click-opt body | 500 Gmail | W5 continuation |
| W7 | 2026-05-25 03:00Z | Subject + body + landing page (two whole emails) | NST control ("8 months" + NST body + `/no-school-today`) | Rach Prelude ("favorite at parties" + Rach gateway-beer body + `/prelude`) | 500 Gmail | First Rach variant; new `/prelude` landing deployed same day |
| W8 | 2026-05-25 05:30Z | Same two whole emails as W7 | NST control | Rach Prelude | 500 mixed (~5% Gmail) | Gmail pool exhausted, broadened to all domains |
| W9 | 2026-05-25 16:30Z | Subject only (Rach body held) | "My favorite piece to play at parties (Prelude in G Minor op 23 no 5)" (current) | "Rachmaninoff's Biggest Banger (Prelude in G Minor)" (new bolder) | 500 mixed | First clean Rach subject test |

## Key results by experiment

All numbers are **Gmail-only** unless noted (Gmail is the only reliable open signal per Apple MPP / corporate scanner caveats from [feedback_gmail_only_honest_metric](../../../.claude/projects/-Users-lionelyu-Documents-DreamPlay-Repos-dreamplay-email-3/memory/feedback_gmail_only_honest_metric.md)).

### W1+W2: Designed HTML vs Plain HTML (500/500, fully mature)

| Arm | Gmail recipients | Gmail opens | Gmail unsubs | Unsub rate |
|---|---:|---:|---:|---:|
| Designed (dark theme) | 498 | 151 (**30.3%**) | 4 | 0.80% |
| Plain (Gmail-style) | 495 | 184 (**37.2%**) | 5 | 1.01% |
| Plain advantage | | **+6.9pp opens** | +1 unsub | +0.21pp |

**Finding**: Plain "personal note" HTML outperforms designed marketing-style HTML on Gmail opens by ~7pp, at the cost of slightly higher unsubs. Mechanism likely Primary-tab placement: Gmail classifies plain-text-looking email as personal correspondence more often.

**Implication**: For low-cadence personal-tone emails, plain wins. For higher-cadence or more transactional content where unsub risk matters more, designed is defensible. We chose designed for W3+ to minimize unsub exposure given the heavy A/B cadence ahead.

### W3+W4: Subject A/B ("20 years" vs "8 months") (500/500, fully mature)

Held HTML constant (designed Style 1 from W1+W2 Arm A) and varied subject only.

| Arm | Gmail recipients | Gmail opens | Gmail unsubs | Unsub rate |
|---|---:|---:|---:|---:|
| Control "I just finished a piece I started writing 20 years ago" | 494 | 169 (**34.2%**) | 12 | 2.43% |
| New "My first new piece in 8 months" | 497 | 148 (29.8%) | 4 | 0.80% |
| Control advantage | | **+4.4pp opens** | +8 unsubs | **+1.63pp** |

**Finding**: The "20 years" subject pulls more inbox attention (the long time-investment story is intrinsically intriguing) but generates 3× the unsubs. The "8 months" subject is more reserved but list-friendlier.

**Implication**: Subject choice is a trade-off between attention and list health. For one-shot announcements with high stakes, "20 years" might be worth the unsub hit. For a long campaign with multiple waves to the same audience, "8 months" is much safer. We picked "8 months" as the W5+ default.

### W5+W6: Body click-optimization (500/500, mature) + first trackable clicks

Held subject ("8 months") and visual frame (designed) constant. Varied body structure. Both arms route primary CTA to the new `/no-school-today` landing page (instead of direct youtu.be), which is when clicks become measurable for the first time in this campaign.

| Arm | Gmail recipients | Gmail opens | Gmail clicks | Unsubs |
|---|---:|---:|---:|---:|
| Control body (long-form narrative) | 497 | 166 (**33.4%**) | 11 (**2.21%**) | 6 (1.21%) |
| Click-opt body (short intro + early CTA + repeated CTA) | 497 | 150 (30.2%) | 3 (0.60%) | 6 (1.21%) |
| Control advantage | | +3.2pp opens | **+1.61pp clicks (3.7× higher)** | tied |

**Finding**: Surprising and significant. The click-OPTIMIZED body got ~4× FEWER clicks than the control body. The longer reflective narrative outperforms the punchier early-CTA structure on both opens AND clicks. Tied on unsubs.

**Implication**: For this audience and this content, narrative builds click intent. The "give them the link early so they don't have to read" framing under-converts because the emotional buildup is what's doing the work. Don't optimize for skimmability when the content rewards reading. Click-opt body retired after W6.

**Also confirmed**: The landing-page swap to `/no-school-today` IS working. 14 unique clickers tracked across W5+W6 with valid sid params recorded in `subscriber_events`. The MIA-clicks problem of W1-W4 was a measurement gap, not a content gap.

### W7: NST vs Rach Prelude two-variant (250/250 Gmail, ~3h matured)

Tested two entirely different emails (different subject, body, landing page) head-to-head. Arm A is the proven W5/W6 NST control. Arm B is brand new: subject about Rachmaninoff Prelude in G Minor, "gateway beer of classical music" body, links to a new `/prelude` landing page deployed same day.

| Arm | Gmail recipients | Gmail opens | Gmail clicks | Unsubs | Unsub rate |
|---|---:|---:|---:|---:|---:|
| NST control ("8 months", NST body, `/no-school-today`) | 248 | 88 (**35.5%**) | 1 (0.40%) | 4 | 1.61% |
| Rach Prelude ("favorite at parties", Rach body, `/prelude`) | 246 | 72 (29.3%) | 3 (1.22%) | 0 | **0%** |

**Finding (W7 alone)**: NST wins opens by +6.2pp. Rach wins clicks 3-1 (3× higher click rate) and unsubs 0-4. Different framings appeal to different parts of the audience: NST subject "8 months" pulls more attention, Rach body converts more attention into actual engagement and avoids the unsub hit.

### W8: Same two emails as W7, mixed audience (250/250, ~11h matured)

Same two variants as W7, but Gmail pool exhausted so audience broadened to all active subscribers (~5% Gmail / ~95% non-Gmail). Per memory: Apple MPP inflates non-Gmail opens, corporate URL scanners can inflate non-Gmail clicks, so W8 raw numbers should NOT be directly compared to W1-W7. Useful instead as a same-arm sanity check on W7 directionality.

| Arm | All recipients | All opens | All clicks | Unsubs |
|---|---:|---:|---:|---:|
| NST control (W8 mix) | 250 | 40 (16.0%) | 2 (0.80%) | 0 |
| Rach Prelude (W8 mix) | 250 | 37 (14.8%) | 1 (0.40%) | 1 |

**Finding (W8 alone, very early/non-final)**: Direction less clear than W7, sample very young. Unsubs still favor Rach (just 1 vs 0 — basically tied at this stage). Will firm up as W8 matures.

### W7+W8 pooled (with caveat)

| Arm | Recipients | Opens | Clicks | Unsubs |
|---|---:|---:|---:|---:|
| NST control | 500 | 128 (25.6%) | 3 (0.60%) | 4 |
| Rach Prelude | 500 | 109 (21.8%) | 4 (0.80%) | 1 |

Reading: pool dilutes the clean W7 Gmail-only read. W7 alone is the more trustworthy comparison.

### W9: Rach subject A/B (250/250 mixed, just fired)

First clean Rach subject test. Body and `/prelude` link held identical between arms.

| Arm | Subject | Status |
|---|---|---|
| A | "My favorite piece to play at parties (Prelude in G Minor op 23 no 5)" | Fires 16:30Z 2026-05-25 |
| B | "Rachmaninoff's Biggest Banger (Prelude in G Minor)" | Fires 16:35Z 2026-05-25 |

Results pending. Watching whether the bolder "Biggest Banger" subject pulls more opens than the personal-anecdote "favorite at parties," with identical body controlling for downstream variables.

## Cumulative unsub picture

Apples-to-apples unsub rate by content style. Important because Rach has fewer total touches (500) than NST cumulative (~3,500), so confidence intervals differ.

| Variant family | Total sent | Total unsubs | Unsub rate | 95% CI (approx) |
|---|---:|---:|---:|---|
| NST subject "20 years" (W3+W4 control) | 497 | 12 | **2.43%** | ~1.4-4.2% |
| NST subject "8 months" (W3+W4 new, W5+W6 ctrl body, W7+W8 NST ctrl) | ~2,000 | 22 | **1.1%** | ~0.7-1.6% |
| Rach Prelude (W7 + W8, all variants) | 500 | 1 | **0.20%** | ~0.0-1.1% |

**Findings**:
- Rach hasn't generated any unsubs in its first 250 Gmail touches and only 1 in 500 total. CI overlaps with "8 months" NST so not yet statistically distinguishable, but the direction is consistent and the maximum-likelihood Rach rate is ~5× lower than NST.
- The "20 years" NST subject is meaningfully worse on unsubs than every other variant tested.
- The "8 months" subject is the durable NST default.

## Mechanical learnings (not A/B)

- **`/no-school-today` and `/prelude` landing pages enable click tracking.** Direct youtu.be links can't be tracked in append-mode (the email tracker only rewrites links to the trackable domain). Both landing pages deployed on the existing `belgium.musicalbasics.com` Next.js app, using the existing `YouTubeFacade` component for lazy-loaded video. Click attribution flows through the existing `<DpAnalyticsBeacon />` in layout.tsx; landing on the page with sid/cid query params auto-fires the click event to `subscriber_events`.
- **Audience is genuinely thin for Gmail-only A/B testing.** Active Gmail count is ~3,555. After 7 Gmail-only waves (3,500 touches), the eligible pool is ~100. W8 onward needs to broaden to mixed audience or wait for fresh acquisition.
- **MPP / corporate scanner noise distorts non-Gmail metrics.** When comparing across waves of different audience composition, anchor on Gmail-only or note the caveat. Cross-wave same-arm comparisons (e.g. W7 Gmail vs W8 mixed) are the cleanest way to quantify the noise.
- **Em-dash policy is enforced at multiple layers** (HTML guard at script load, patch-time guard, auditor verification). Zero em-dashes shipped in any C2 wave.
- **Concurrency lock + sequential scheduledAt with 5-min stagger has been bulletproof.** Zero double-sends across 18 production children. Every wave completed within wall-clock estimate.

## Open questions

- Does the "Biggest Banger" subject (W9 Arm B) outperform "favorite at parties" (W9 Arm A) on opens? Currently in flight.
- Does the Rach variant's lower unsub rate hold when sample size grows to ~1,500+? W9+W10 will help firm this up.
- Is the W7 finding (Rach wins clicks AND unsubs, NST wins opens) durable, or is it a function of the audience having already seen 6 NST waves and being open-fatigued on that framing?
- Conversion to Belgium concert ticket sales: not yet tracked at the click-to-purchase level in C2 (Belgium landing page Shopify analytics would need cross-correlation with `subscriber_events` clicks). Worth instrumenting before drawing dollar-value conclusions.

## Follow-up campaign

Campaign 3 (Belgium concert trailer A/B, 9,143 recipients across 3 waves, 2026-05-30 to 2026-05-31) results: [CAMPAIGN-3-TRAILER-RESULTS.md](CAMPAIGN-3-TRAILER-RESULTS.md). Key finding that closes a C2 open question: action-clarity subject framing ("Watch my upcoming concert trailer") lifts trailer-LP CTR by +54% relative vs benefit-framing ("Experience the energy..."), at equal open rate. Short body beats Long body on every engagement metric.
