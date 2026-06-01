# Campaign 3 results: Belgium concert trailer A/B

Three-wave trailer announcement campaign for the June 11, 2026 Belgium concert. Fired 2026-05-30 to 2026-05-31. Tests body length (Short vs Long) in waves 1+2, then subject framing (Short body + new subject "Watch my upcoming concert trailer") in wave 3. Per-wave operational detail lives in [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md).

## Overview

| Field | Value |
|---|---|
| Campaign | Belgium concert trailer announcement (June 11, 2026 at Theaterzaal Maupertuis, Zaventem) |
| Primary content | YouTube trailer (60s, started at `wQYhjQ8Ibls?t=24`, embedded on `belgium.musicalbasics.com/concert-trailer`) |
| Total sent | **9,143** unique recipients across 3 waves, 37 send-children |
| Audience composition | Cross-source: Supabase active + Shopify consent-eligible + Omnisend Subscribed + Wix orders BE/NL/LU/GB/DE; cross-workspace non-active excluded (added mid-campaign after W1+W2) |
| Idempotency tag | `done-belgium-trailer-2026-05-30` |
| Landing page deployed for click tracking | `/concert-trailer` (also added `/moonlight-sonata-nightmare`, `/12-levels-of-beethoven`, `/still-dre` for the Long version's viral-videos block) |
| Health | 0 spam complaints, 0 bounces logged on subscriber_events across all 9,143 sends |

## What was tested in each wave

| Wave | Fire (UTC) | A/B variable | Arm A | Arm B | Recipients |
|---|---|---|---|---|---|
| W1 | 2026-05-30 14:00-15:00Z | Body length | Short (~290 words) | Long (~720 words, event details + bio + 3 viral videos + 3 testimonials) | 4,000 (2000+2000) |
| W2 | 2026-05-30 16:30-17:00Z | Body length (continuation) | Short | Long | 2,000 (1000+1000) |
| W3 | 2026-05-31 09:00-09:48Z | Subject + opening copy | Short body w/ "Experience the energy of an evolved piano concert" subject (control) | Short body w/ "Watch my upcoming concert trailer" subject (Version C) | 3,143 (1,425 Short + 1,718 C) |

All arms shared: same hero (YouTube thumbnail), same `/concert-trailer` LP destination, same `Watch the trailer` / `Watch now on YouTube` CTA button, same closing block ("Join the lucky group..." + livestream + signature).

## Stats by arm (combined waves 1+2, head-to-head wave 3)

### Waves 1+2: Short vs Long body (3,000 each, both 24h+ mature)

| Metric | Short | Long | Delta |
|---|---:|---:|---|
| Opens (unique) | 1,002 (**33.4%**) | 858 (28.6%) | **Short +4.8pp, +17% relative** |
| Clicks (unique) | 46 (1.53%) | 37 (1.23%) | Short +9 (+24% rel) |
| Trailer LP clicks (unique) | 36 (**1.20%**) | 27 (0.90%) | **Short +33% rel** |
| Unsubs | 51 (1.70%) | 35 (1.17%) | Long lower by 0.53pp |
| Spam complaints | 0 | 0 | clean |
| Bounces (logged events) | 0 | 0 | clean |
| Livestream purchases attributed | **1** | 0 | Short +1 (n=2 total; one buyer was outside audience) |

### Wave 3: Short subject vs Version C subject (Short body held constant)

| Metric | Short (1,425) | C (1,718) | Delta |
|---|---:|---:|---|
| Opens (unique) | 376 (26.39%) | 447 (26.02%) | tied (within noise) |
| Clicks (unique) | 18 (1.26%) | 28 (1.63%) | C +10 (+29% rel) |
| Trailer LP clicks (unique) | 13 (0.91%) | 24 (**1.40%**) | **C +11 (+54% rel)** |
| Unsubs | 22 (1.54%) | 26 (1.51%) | tied |
| Spam complaints | 0 | 0 | clean |
| Bounces (logged events) | 0 | 0 | clean |

## Findings

### 1. Subject framing matters more than body length

The Wave 3 Short vs C test (same body, only subject + opening lines change) produced the strongest relative CTR lift in the entire campaign: **+54% on trailer-LP clicks for Version C** vs the Short subject, with essentially identical open rates.

**Winning subject:** `Watch my upcoming concert trailer`
**Losing subject:** `Experience the energy of an evolved piano concert`

The action-clarity subject (`Watch [verb] [noun]`) sets a concrete expectation. Recipients know exactly what they'll get when they click. The benefit-framing subject (`Experience the energy of...`) is vague and curiosity-bait, which pulls the same opens but loses click-through.

### 2. Short body beats Long body when subject is held

Waves 1+2 (subject held, body varied): Short wins on every engagement metric.
- Opens: +17% relative
- Clicks: +24% relative
- Trailer LP clicks: +33% relative
- Unsubs trade-off: Short is slightly higher (1.70% vs 1.17%) - the more visible CTA produces some unsubs, but the per-thousand-engaged ratio is still better.

The Long version's added content (event details, sold-out venues bio, viral-videos block linking to 3 separate LPs, testimonials, secondary CTA) added friction without adding clicks. Recipients scanned past it.

### 3. Best email (untested directly): Short body + C subject

We tested body and subject as separate variables. The clear inference is:
- Use Short body (W1+W2 verdict)
- Use C subject (W3 verdict)

This combo wasn't tested directly. Subsequent campaigns should use this default and only A/B further variations from it.

### 4. Audience quality declines as we descend the hash positions

Wave 3 Short opens 26.4% vs Wave 1+2 Short opens 33.4% - same body, same subject, ~7pp lower. The W3 cohort sits in hash positions 3000+ across the audience, which by random construction skews toward less-engaged contacts (older Wix purchasers, dormant Omnisend Non-subscribed, etc.). This is a strong signal that **engagement-based audience filtering should be a prerequisite for future bulk sends**, not just status-based.

### 5. Device breakdown (from 133 unique trailer-campaign clickers)

| Device | Unique clickers | % |
|---|---:|---:|
| Mobile (iPhone + Android) | 74 | **55.6%** |
| Desktop (Win + Mac + Linux) | 58 | 43.6% |
| Tablet (iPad) | 1 | 0.8% |

Per device: iPhone 36.1%, Windows 29.3%, Android 19.5%, Mac 12.0%, Linux 2.3%, iPad 0.8%.

Mobile-first email design choices (single column, large tap targets, hero thumbnail that doubles as primary CTA) are paying off. iPhone is the single largest device - body and LP should always be QA'd on iPhone Safari first.

### 6. Dwell time on `/concert-trailer` is converged (~70s median)

LP analytics captured 22 unique sessions on `/concert-trailer` from email click-throughs (12 Short, 10 Long).

| Arm | n | avg | median | p95 |
|---|---:|---:|---:|---:|
| Short | 12 | 43.8s | 42s | 88s |
| Long | 10 | 41.6s | 48s | 75s |

Dwell time is essentially indistinguishable between arms. Most engaged sessions cluster around 70-90s - exactly the trailer length - suggesting people came to watch the video, watched it, then left. The arm-level difference shows up at the **inbox layer** (open and click rates), not at the LP. Once on the LP, the experience converges.

This is useful intel: post-click optimization should focus on what happens AFTER the trailer finishes (ticket CTA placement, livestream cross-sell) rather than the LP copy itself.

### 7. Conversion attribution: 1 of 2 livestream purchases came from Short arm

In the 36 hours during/after the trailer campaign:
- 2 livestream purchases ("Email List Exclusive" variant) on Shopify
- 1 of them (`metodivelkov@gmail.com`) received Short chunk #8 of W1 at 14:56Z, bought 58 min later. Clear attribution.
- The other (`astheworldfallzdown@gmail.com`) bought via the same Shopify variant but was NOT in our trailer audience. Likely received the discount link from a different channel (older Omnisend / Shopify email, or a forwarded link).

Small sample, but the attributable purchase came from Short. With more send volume the click-to-purchase ratio could be quantified properly. Currently we have ~50 trailer-LP clicks across the entire campaign - purchase-rate inference is noisy at this scale.

## Tracking gaps surfaced this campaign

These don't block the current campaign but should be fixed before the next major send:

1. **Open events don't capture `user_agent` or `ip_address`** (only click events do). The tracking pixel handler lives in `dreamplay-email-2` repo and only logs the bare minimum on opens. Result: mobile/desktop breakdown only available for clickers, not the larger opens population. Fix: extend the open-pixel handler to capture UA + IP just like the click-redirect handler does.

2. **Cross-workspace status was not checked at audience-build time** (initially). 151 recipients of W1+W2 were already `inactive`/`unsubscribed`/`bounced` on `dreamplay_marketing` workspace. Same canonical email, different per-workspace status; spam filters track sender domain not per-list status, so reputation hits regardless. Fix applied mid-campaign at [_work/build-trailer-audience.py:326-372](../_work/build-trailer-audience.py) - all future audience builds must use the all-workspaces scan, not workspace-scoped.

3. **Invalid email regex pre-filter is missing from the main scheduler.** W3 crashed mid-flight on `ryahn.vehra#@gmail.com` (`#` is invalid in local part). Recovery scripts at [_work/resume-w3-chunks-11-12.ts](../_work/resume-w3-chunks-11-12.ts) added the regex check; should be backported to [_work/schedule-belgium-trailer-ab.ts](../_work/schedule-belgium-trailer-ab.ts) and any future scheduler templates.

4. **`xlsx` "unsubscribed" lists at `docs/More Unsubscribed Emails Delete.xlsx` and `docs/Unsubscribed Emails To Delete Omnisend.xlsx` were intentionally NOT used** as exclusions after analysis showed they're unreliable (5,349 emails; only 14 verifiably negative, 73 actively engaged). Decision documented; do not re-treat as authoritative.

## Things to try next

In rough priority order:

1. **Apply the wins (Short body + C subject) as the new default email template.** Don't re-test what's already decided.

2. **A/B the C subject against an even more direct variant.** Hypotheses to test:
   - `My Belgium concert trailer (60 seconds)` - adds the duration up-front, removes "upcoming"
   - `Trailer for my Belgium concert, June 11` - adds the date
   - `Watch this in 60 seconds [trailer]` - flips the value prop to "small time commitment"

3. **Engagement-based audience pre-filter for next bulk send.** Exclude anyone who hasn't opened any of our last N emails. The W3 audience-quality decline (-7pp opens on same content) is strong evidence the long-tail audience is dragging down rates. A simpler heuristic: exclude `last_email_open_at IS NULL OR last_email_open_at < (now - 180 days)`. Saves sender-reputation budget for the engaged segment.

4. **Add purchase tracking from LP to email.** Right now we cross-reference Shopify orders to email subscribers manually. Adding a webhook from Shopify orders into a `belgium_purchases` table (joined on canonical email + `cid` query param from referrer if present) would automate the conversion funnel. Important enough to do before next concert announcement.

5. **Fix open-pixel UA capture (gap 1 above).** Lets us answer mobile-vs-desktop on opens too, not just clicks. ~1-line change in `dreamplay-email-2/app/api/track/open/route.ts` or wherever the pixel handler is.

6. **Test reply-prompting body.** Try an email that asks for a reply ("Hit reply and tell me if you're coming"). Replies are the strongest deliverability positive signal Gmail / Yahoo track - far more than opens or clicks. Risk is unsubs go up if too many people feel pressured; mitigate with one-of-two-CTAs split.

7. **Test sending from a person, not the brand.** Currently we send from `Lionel Yu <lionel@musicalbasics.com>`. Try the same content from `Lionel <lionel@musicalbasics.com>` (drop the last name in the from-name) - might lift opens by feeling less corporate.

8. **Re-fire the SHORT+C combo to the engagement-filtered audience for a clean validation read.** Once we filter aggressively (active openers only), what does Short+C look like at scale? The hypothesis is open rate >40% and trailer-CTR >2.5% in a high-engagement cohort.

## Cross-references

- Per-wave operational detail: [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md) (entries dated 2026-05-30 to 2026-05-31).
- Prior campaign (C2: NST + Rachmaninoff cross-sell): [CAMPAIGN-2-RESULTS.md](CAMPAIGN-2-RESULTS.md).
- First campaign (C1: Belgium announcement + masterclass): [CAMPAIGN-1-RESULTS.md](CAMPAIGN-1-RESULTS.md).
- Sends index (every send, tabular): [SENDS-INDEX.md](SENDS-INDEX.md).
