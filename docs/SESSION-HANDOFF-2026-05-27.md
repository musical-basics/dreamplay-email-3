# Session Handoff, 2026-05-27

State at end of this session. Read this first. Successor to `docs/SESSION-HANDOFF-2026-05-22.md`.

## TL;DR

**Campaign 2 in flight. 13 waves fired (W1-W13), Send 1-40 in DB.** W13 just fired (07:40Z-08:00Z) and is maturing. Audience runway: ~2,960 done-NST still untouched by Fur Elise.

**Three email variants in rotation:**
1. NST (No School Today) - the original C2 variant, links `/no-school-today`
2. Rach Prelude in G Minor - W7+ Rach gateway-beer pitch, links `/prelude`
3. Fur Elise three-ways (classical/heroic/dubstep) - W11+ Fur Elise, links `/fur-elise`

**Three landing pages live** on belgium-concert-landing-page: `/no-school-today`, `/prelude`, `/fur-elise` — all use the existing `YouTubeFacade` component, all cross-link to each other + Belgium concert tickets, all trackable via the existing `<DpAnalyticsBeacon />`.

**Dashboard live**: https://belgium.musicalbasics.com/analytics/email-campaigns (admin-IP gated to `71.121.213.108`, fetches from email Supabase via `EMAIL_SUPABASE_*` env vars).

**Concert is 2026-06-11**, ~15 days away.

## What's scheduled imminently, DO NOT CANCEL WITHOUT INTENT

**W13 - Fur Elise preheader A/B (just fired 07:30Z, will complete by 08:05Z)**:

| Chunk | Variant | Child | Fires UTC |
|---|---|---|---|
| A1 | no preheader | `47e5ca82-0175-44f1-b614-37d850e9d7da` | `2026-05-27T07:40:00Z` |
| B1 | with preheader | `08923eb5-ef0b-496f-81c9-f8bc103e05b0` | `2026-05-27T07:45:00Z` |
| A2 | no preheader | `6ac9d748-8727-4b60-ad29-07d56928b406` | `2026-05-27T07:55:00Z` |
| B2 | with preheader | `3f92aaaa-1fa8-4e47-92d7-02522f702d6d` | `2026-05-27T08:00:00Z` |

All 4 carry subject `"They said 'Fur Elise' is boring, so I played this"`. Preheader for Arm B: `"Classical to dubstep in 3 minutes."` plus `&nbsp;&zwnj;` padding (industry-standard pattern). 1,000 recipients tagged `done-fur-elise` after schedule.

## Campaign 2 wave history (all SAFE-audited, all completed)

| Wave | Date | Variable | Arm A | Arm B | Recipients |
|---|---|---|---|---|---|
| W1 | 2026-05-22 00:05/10Z | HTML design | Designed | Plain | 500 Gmail |
| W2 | 2026-05-23 05:52/57Z | HTML design | Designed | Plain | 500 Gmail |
| W3 | 2026-05-24 03:08/13Z | Subject | "20 years" | "8 months" | 500 Gmail |
| W4 | 2026-05-24 04:53/58Z | Subject | "20 years" | "8 months" | 500 Gmail |
| W5 | 2026-05-24 09:25/30Z | Body | Long narrative | Click-opt | 500 Gmail |
| W6 | 2026-05-24 10:10/15Z | Body | Long narrative | Click-opt | 500 Gmail |
| W7 | 2026-05-25 03:00/05Z | NST vs Rach | NST control | Rach Prelude | 500 Gmail |
| W8 | 2026-05-25 05:30/35Z | NST vs Rach | NST control | Rach Prelude | 500 mixed |
| W9 | 2026-05-25 16:30/35Z | Rach subject | "favorite" | "Banger" | 500 mixed |
| W10 | 2026-05-25 18:25/30Z | Rach subject | "favorite" | "Banger" | 500 mixed |
| W11 | 2026-05-26 08:30/35Z | Fur Elise subject | "boring" | "2026" | 500 mixed |
| W12 | 2026-05-26 20:10-30Z | Fur Elise subject (retarget) | "boring" x2 | "2026" x2 | 1000 mixed (4x250) |
| W13 | 2026-05-27 07:40-08:00Z | Fur Elise preheader | no preheader x2 | with preheader x2 | 1000 mixed (4x250) |

**Total C2 sends**: 7,500 emails across 13 waves.

Full per-wave detail in [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md). Cross-wave synthesis in [CAMPAIGN-2-RESULTS.md](CAMPAIGN-2-RESULTS.md) (covers through W9; update for W10-W13 still TODO).

## Findings to date (mature waves only)

| Test | Result | Confidence |
|---|---|---|
| Plain vs designed HTML (W1+W2) | Plain wins opens +6.7pp (38.2% vs 31.5%), +3 unsubs cost | High, n=500/500 |
| "20 years" vs "8 months" subject (W3+W4) | "20 years" wins opens +5.4pp (36.0% vs 30.6%), 3x unsubs (12 vs 4) | High, n=500/500 |
| Long narrative vs click-opt body (W5+W6) | **Long wins clicks 1.4x**, +4.8pp opens, tied unsubs. Surprise. | High, n=500/500 |
| NST vs Rach Prelude (W7+W8) | NST wins opens +3.2pp, **Rach wins CTR 1.7x** (3.8% vs 2.2%) | High, n=500/500 |
| Rach "favorite" vs "Banger" subject (W9+W10) | TIED. Both 39.2% opens, ~5% CTR | High, n=500/500 |
| Fur Elise "boring" vs "2026" subject (W11+W12) | "2026" wins opens +1.2pp, **"boring" wins CTR 1.5x** (3.2% vs 2.1%) | Medium, n=750/750 (W12 still maturing) |
| Fur Elise preheader A/B (W13) | TBD | Pending |

**Best email by CTR (sorted desc, mature):**
1. Rach Prelude with "favorite at parties" subject (W9+W10): **5.2% CTR**
2. Rach Prelude with "Banger" subject (W9+W10): 4.6% CTR
3. Rach Prelude (W7+W8 mixed): 3.8% CTR
4. Fur Elise "boring" (W11+W12): 3.2% CTR (still maturing)
5. NST control (W5+W6): 2.2% CTR
6. Fur Elise "2026" (W11+W12): 2.1% CTR

**Rach Prelude email is still the campaign's highest converter.** Fur Elise "boring" subject is competitive but not winning. NST is significantly behind on clicks.

**Cumulative unsub rates (apples-to-apples):**
| Variant family | Sent | Unsubs | Rate |
|---|---:|---:|---:|
| NST subject "20 years" | 497 | 12 | 2.43% |
| NST subject "8 months" (all uses) | ~2,000 | ~22 | ~1.1% |
| Rach Prelude (all subjects) | ~1,500 | ~10 | ~0.7% |
| Fur Elise (all subjects) | ~1,500 | 6 | ~0.4% |

Fur Elise has the lowest unsub rate so far. Notable: W12 retargeting (1000 recipients getting a 2nd C2 email) had **0 unsubs at 5h** — list tolerates the second touch very well.

## Audience runway

| Cohort | Count |
|---|---:|
| Active subscribers | 5,608 |
| Active Gmail | 3,555 |
| Tagged `done-no-school-today` (got any C2 wave) | 5,456 |
| Tagged `done-fur-elise` (got W11/W12/W13 Fur Elise) | 2,496 (after W13) |
| **Eligible for W14+ Fur Elise retarget** | ~2,960 |
| **Gmail-only eligible for W14 Fur Elise** | ~30 (essentially exhausted) |
| **Fresh untouched-by-C2 active** | ~150 |

**One more big retarget wave possible** (1000 mixed) before pool gets thin. Beyond that need to either accept smaller waves, broaden audience, or wait for new acquisitions.

## Tags reference

| Tag | Purpose | Applied by |
|---|---|---|
| `done-belgium-followup-b` | C1 follow-up qualifier; nearly universal on active list (5,616/5,624) | C1 setup scripts |
| `done-no-school-today` | Got any C2 wave (W1-W13) | Every C2 schedule script (in `schedule-campaign-2-wave-N.ts`) |
| `done-fur-elise` | Got any Fur Elise variant (W11, W12, W13) | W11 setup + retroactive tag for W12/W13 |
| `Test Account` | 8 test inboxes for previews | Manual |
| `Bounced` | Hard bounces | Inngest bounce handler |

## Active scripts (all in `_work/`, gitignored)

- `recent-send-stats.ts` - main stats script. Loops through SENDS array and prints per-send + pooled per-experiment metrics. Add new wave child IDs here when firing.
- `campaign-2-wave-N-setup.ts` - one per wave, creates drafts. Reusable as template.
- `schedule-campaign-2-wave-N.ts` - one per wave, fires + tags. Reusable as template.
- `tag-w11-fur-elise.ts` - one-off to retroactively tag W11 recipients with `done-fur-elise`. Pattern for other retroactive tagging if needed.
- `check-w11-status.ts`, `check-wave-7-status.ts`, etc. - per-wave status spot-checks.
- `probe-audience-counts.ts` - dump current audience counts by tag. Useful for runway checks.

**Wave HTML files** (in `_work/`):
- `no-school-today-w5-arm-a-control.html` - NST long narrative with `/no-school-today` link (W5+W6 control body)
- `no-school-today-w5-arm-b-clickopt.html` - NST click-opt body (W5+W6 Arm B, RETIRED, lost to control)
- `no-school-today-w7-arm-b-rach.html` - Rach Prelude gateway-beer body, links `/prelude` (W7+ Rach arm)
- `fur-elise-w11.html` - Fur Elise three-ways body, links `/fur-elise` (W11+ Fur Elise arm, no preheader)
- `fur-elise-w13-arm-b-preheader.html` - same as W11 but with hidden preheader div at top

## Dashboard

**https://belgium.musicalbasics.com/analytics/email-campaigns**

Built this session. Server component, no internal HTTP roundtrip. Source:
- Page: `src/app/analytics/email-campaigns/page.tsx` (in belgium-concert-landing-page repo)
- Data helper: `src/lib/db/email-campaigns.ts` (in belgium-concert-landing-page repo)

Hardcoded wave list (currently covers W1-W10, **needs W11-W13 added to render those**). To add a new wave: edit the `SENDS` array in `src/lib/db/email-campaigns.ts` with the new child IDs + metadata.

IMPORTANT: PostgREST max-rows cap is 1000 per request. Page uses paginated `pgrestGetAll()` helper with Range header. Don't replace with single-page `pgrestGet()` for sent_history or subscriber_events queries.

## Landing pages

All live on belgium.musicalbasics.com via belgium-concert-landing-page repo:

| URL | Built session | Embed video | Cross-links |
|---|---|---|---|
| `/no-school-today` | This session | `y3SZI2AM0Uc` | -> `/` Belgium tickets |
| `/prelude` | This session | `Bjouy1XpO9M` | -> `/no-school-today`, `/` |
| `/fur-elise` | This session | `40ruweRl54k` | -> `/no-school-today`, `/prelude`, `/` |

All use `YouTubeFacade` component, `noindex` set, click tracking automatic via existing `<DpAnalyticsBeacon />` in layout.

## Gotchas + lessons from this session

1. **PostgREST silently caps at 1000 rows**. The `limit=20000` query param is ignored. Use Range headers + pagination for any query expected to return >1000 rows. Bit me on the dashboard build.

2. **Server-side internal HTTP calls from Next.js page to its own API lose `x-forwarded-for`**. Original dashboard implementation 403'd because the IP gate couldn't see the user's real IP through the Vercel internal call. Refactored to call data helpers directly. **Pattern**: server components fetching data from same project should call library functions, not internal HTTP routes.

3. **Vercel maxDuration is 300s per route**. 250-recipient sends ~225s wall-clock. Going to 500-recipient single child would blow the budget. Always chunk to 250 max per child.

4. **5-min stagger between chunks is the safe minimum** but has only ~75s of headroom if Resend latency spikes. Concurrency lock will serialize but next chunk fire may drift past nominal slot. Don't worry, just expect.

5. **W11 had tiny Gmail subset** (3-7% Gmail) because the fresh pool was non-Gmail-heavy by the time W11 fired. **W12+ retargeting cohort skews 70-75% Gmail** because they were earlier-acquired (and earlier waves over-fired Gmail). Gmail-only signal usable on W12+ retargeting, not on W11.

6. **`&nbsp;&zwnj;` preheader padding is safe** per industry references but watch W13 carefully — if Arm B opens come in LOWER than Arm A, that's the signal of spam-filter penalty.

7. **Background bulk-tag API calls take 30-60s per 500 emails**. Schedule scripts that tag 1,000+ run slow on the tag step. Used `run_in_background: true` for W12/W13 schedule scripts to avoid blocking.

8. **Em-dash check is in every patchChild() guard**. Every HTML + subject goes through it. Don't bypass.

9. **Rach Prelude body + `/prelude` landing converts at ~5% CTR consistently** across all subject variants tested. The body+landing combo is doing the work, not the subject.

## Recommended next moves

1. **Wait for W13 maturity (24-48h)**. Will tell us if preheader text helps opens and if `&nbsp;&zwnj;` padding is safe. Big read for future emails — preheader is a near-free open-rate lever if it works.

2. **Update [CAMPAIGN-2-RESULTS.md](CAMPAIGN-2-RESULTS.md) to include W10-W13**. Currently stops at W9. Doc was a one-shot synthesis early in the session.

3. **Add W11-W13 to dashboard**. Hardcoded SENDS array in `src/lib/db/email-campaigns.ts` needs them. ~5 min edit.

4. **W14 candidates** (high-leverage things still untested):
   - Single vs dual CTA (remove "Belgium concert tickets" secondary, see if primary CTR rises)
   - CTA button copy with explicit runtime "Play it now (3 min)"
   - Rach Plain vs Designed (replicate W1+W2 design test on Rach body)
   - From-name "Lionel Yu" vs "Lionel" alone

5. **Belgium concert ticket conversion attribution**. We have email clicks tracked but NOT yet correlated with actual Belgium concert ticket sales. Worth instrumenting — would tell us which email/subject is actually driving revenue, not just engagement. The Shopify ticket order data exists in another repo. Cross-correlation script would need to join `subscriber_events.click` + `concert_tickets.ticket_orders` by email/sid.

## Recent commits (newest first)

```
1d0e27f docs(audit): Campaign 2 wave 13 (Send 37-40) SAFE verdict, 4x250 fires 07:40Z-08:00Z
2869702 docs(audit): Campaign 2 wave 12 (Send 33-36) SAFE verdict, 4x250 chunks 20:10Z-20:30Z
1e6ad35 docs(audit): Campaign 2 wave 11 (Send 31 + Send 32) SAFE verdict, fires 08:30Z/08:35Z
8ef28e8 docs(audit): Campaign 2 wave 10 (Send 29 + Send 30) SAFE verdict, fires 18:25Z/18:30Z
e929a0f docs(audit): Campaign 2 wave 9 (Send 27 + Send 28) SAFE verdict, fires 16:30Z/16:35Z
9cc0cde docs: Campaign 2 results doc synthesizing W1-W9 A/B findings
33b523b docs(audit): Campaign 2 wave 8 (Send 25 + Send 26) SAFE verdict, fires 05:30Z/05:35Z
5760784 docs(audit): Campaign 2 wave 7 (Send 23 + Send 24) SAFE verdict, fires 03:00Z/03:05Z
```

belgium-concert-landing-page:
```
1d0e27f? not in this repo - check belgium-concert repo
01281b5 Fix /analytics/email-campaigns 403: gate at page, fetch data directly
1cae19f Fix email-campaigns dashboard truncation: paginate via Range header
b090448 Add /fur-elise landing page (3-version Fur Elise embed)
06b2441 Add /prelude landing page with Rachmaninoff Prelude G Minor embed
3ad6f28 Add repertoire teaser to /no-school-today page
177f8c8 Add /no-school-today landing page with YouTube embed and Belgium concert CTA
```

## Constants / IDs reference

- Email Supabase project: `quyqwdjygzalqqmrgkfk`
- Concerts Supabase project: `szlagsmxgfsobizzxaog` (NOT for email work)
- Belgium concert landing repo: `/Users/lionelyu/Documents/New Version/belgium-concert-landing-page`
- Variant A parent template: `b04a217d-7855-447e-9b29-fa25b50802a0`
- Variant B parent template: `db10a687-4233-4313-8431-8d2fa64a15c4`
- Resend rate limit: 5 req/s
- Vercel maxDuration: 300s
- YouTube videos in C2: `y3SZI2AM0Uc` (NST), `Bjouy1XpO9M` (Rach), `40ruweRl54k` (Fur Elise)

## Files to read first if context-compacted

1. **This doc** (you are here)
2. [CAMPAIGN-2-RESULTS.md](CAMPAIGN-2-RESULTS.md) - cross-wave synthesis (stops at W9 currently)
3. [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md) - per-wave operational record (W13 newest entry)
4. [_work/recent-send-stats.ts](../_work/recent-send-stats.ts) - run with `npx tsx` for current stats
5. [CLAUDE.md](../CLAUDE.md) - standing rules + send safety contract
