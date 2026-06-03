# Session handoff, 2026-06-02

Picks up from [SESSION-HANDOFF-2026-05-29.md](SESSION-HANDOFF-2026-05-29.md). Covers the Belgium concert trailer A/B campaign (waves 1-3), cross-workspace audience-filter fix, frustration-driven pivot toward in-person sales, and the Belgium logistics email drafted but not yet scheduled.

Concert is **June 11, 2026** at Theaterzaal Maupertuis, Zaventem. **9 days from this handoff.**

## TL;DR for the next Claude

1. **Trailer A/B campaign DONE.** 9,143 sent across 3 waves (May 30-31). Settled stats:
   - **Best body: Short** (vs Long: +13% opens, +39% trailer CTR)
   - **Best subject: "Watch my upcoming concert trailer"** (vs "Experience the energy...": same opens, **+71% relative trailer CTR**)
   - Inferred default = Short body + C subject (not directly tested but the obvious combo)
   - Full writeup: [CAMPAIGN-3-TRAILER-RESULTS.md](CAMPAIGN-3-TRAILER-RESULTS.md)
2. **Belgium logistics email is DRAFTED but NOT YET SENT.** User approved the strategy but never gave the schedule go-ahead. Files ready at `_work/belgium-logistics.html`, audience built (1,964 recipients). See [§ Belgium logistics: ready to schedule](#belgium-logistics-ready-to-schedule).
3. **The trailer drove livestream sales, NOT in-person.** 8 livestream / 0 in-person attributable. Likely audience-product mismatch + framing routes to livestream. The logistics email addresses this.
4. **Cross-workspace exclusion fix applied** to audience build (`_work/build-trailer-audience.py:326-372`). Old build only checked status on `musicalbasics` workspace; new build scans all (catches 151 wave-1+2 leaks to `dreamplay_marketing` non-active subs).

## Trailer A/B campaign result summary

| Email | Sent | Open | CTR | Trailer LP CTR | Unsub |
|---|---:|---:|---:|---:|---:|
| Short body, original subject (W1+W2) | 3,000 | **35.13%** | 1.63% | **1.30%** | 1.97% |
| Long body, original subject (W1+W2) | 3,000 | 30.97% | 1.40% | 0.93% | 1.53% |
| Short body, original subject (W3) | 1,425 | 30.95% | 1.47% | 1.12% | 2.04% |
| Short body, **C subject** (W3) | 1,718 | 30.38% | **2.21%** | **1.92%** | 1.57% |

- Across all 9,143 sends: **0 spam complaints, 0 logged bounces** in subscriber_events.
- Mobile 56% / Desktop 44% on clicks (iPhone 36% largest single device).
- LP dwell time converged at ~70s across arms (= trailer length). Arm differences live in the inbox, not on the LP.
- 1 in-person purchase BEFORE wave 1 (Sham Sansoy, May 29) - organic, not attributable.

**Subject framing wins matter MORE than body length.** That's the headline finding.

Detailed per-child breakdown: `_work/weekend-emails-stats.md` (regenerable via `npx tsx _work/stats-trailer-wave1.ts`).
Visual side-by-side of all 4 emails: `_work/weekend-emails-showcase.html` (open in browser).

## Belgium logistics: ready to schedule

User was frustrated that the trailer drove livestream-only sales. Diagnosis: ~7,500 of 9,143 recipients live outside reasonable travel range of Brussels, so livestream is their only option. The audience-product mismatch routes everyone to livestream regardless of trailer quality.

**Solution drafted:** Belgium-region-only email focused on logistics ("Eurostar 2h from London, ICE 1h45 from Cologne, train from Amsterdam 1h50").

**Files (all in `_work/`, gitignored):**
- HTML: `belgium-logistics.html` (11 KB, Short-body length, action-clarity subject, applies C3 winners)
- Audience: `build-logistics-audience.py` builds → `logistics-audience.json` (1,964 entries)
- Test send: `test-send-belgium-logistics.ts` (already fired to Lionel inbox at 13:02Z 2026-06-02)
- DONE_TAG: `done-belgium-logistics-2026-06-02` (separate from trailer tag, so prior recipients are re-targetable)

**Audience: 1,964 Belgium-region recipients:**
| Country | Count |
|---|---:|
| Germany | ~1,006 |
| UK | ~616 |
| Netherlands | ~166 |
| France (north) | 90 |
| Belgium | ~72 |
| Luxembourg | ~14 |

After: cross-workspace non-active exclusion (833 dropped), HARD_EXCLUDE for 8 Test Accounts, invalid-email regex.

**Email composition:**
- Subject: `Brussels in 9 days, easier than you'd think`
- Preheader: `Eurostar 2h. ICE 1h45. Train from Amsterdam 1h50.`
- Headline: `Brussels in 9 days, easier than you'd think.`
- Body opens with the practical question (vs trailer's emotional pitch)
- Direct-train list with 5 routes + times
- Venue logistics block ("5 min from airport, easy day trip")
- Single CTA: `Get tickets · €29`
- Single testimonial (Rinze Z., Amsterdam - geographic match)
- Livestream demoted to one quiet line at bottom (deliberate, in-person is the goal)

**To schedule (when user gives the word):**
1. Build a scheduler modeled on `_work/schedule-belgium-trailer-w3-c-vs-short.ts`, but single-arm (no A/B), reading from `_work/logistics-audience.json`.
2. CHUNK_SIZE=250, STAGGER_SEC=240. 1,964 / 250 = 8 chunks total.
3. SCHEDULED_FIRST_FIRE recommended: tomorrow 09:00 UTC (5am EDT 2026-06-03). 6 days before the concert is the sweet spot - still time to book Eurostar without panic pricing.
4. DONE_TAG = `done-belgium-logistics-2026-06-02`.
5. MUST run send-safety-auditor before firing (CLAUDE.md mandate).
6. Append audit log entry to `docs/SEND-AUDIT-LOG.md`.

User said "yes" to drafting; never said "yes" to scheduling. **Confirm before firing.**

## Bandsintown email (parallel channel, sent by user)

User sent a Bandsintown email to their followers around 2026-06-01. Subject and copy followed the C3 winners pattern (per my recommendation). Tracking results:

- Bandsintown UI reported "2 clicks" but data shows those are likely Google infrastructure prefetches (`66.249.*` Googlebot, `172.253.*` Google image-proxy) not real humans.
- 5 sessions tagged `utm_source=bandsintown` in LP analytics: 3 from Lionel's own IP (`71.121.213.108`), 2 from Google IP ranges. **0 real-human visits attributable.**
- The email DID deliver to Gmail recipients (Google prefetch is the proof). Just no clicks yet at snapshot time.

UTM tagging guidance given for future Bandsintown sends:
- `utm_source=bandsintown&utm_medium=email&utm_campaign=belgium-2026-06-11&utm_content=<link-identifier>`
- LP analytics already captures all 5 standard UTM params (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) into `analytics_logs.metadata`.
- To get honest click count: filter out known bot IP ranges (`66.249.*`, `172.253.*`, `172.217.*`, `35.190.*`, `40.94.*`) and Lionel's own IP.

## Mid-campaign incidents and recoveries

### Wave 1 partial fire + recovery (2026-05-30)
Scheduler scheduled 14 of 16 children before user spotted that the visible body text `https://youtu.be/N75lvM0-hn8` was hyperlinked to a DIFFERENT URL (`/concert-trailer` for tracking). Display-URL ≠ destination-URL = phishing-filter signature. Recovery:
- All 14 cancelled via `_work/cancel-trailer-wave1.ts` (set `scheduled_status='cancelled'`; Inngest short-circuits cancelled campaigns).
- Cleared `done-belgium-trailer-2026-05-30` tag from 3,500 affected subs (had to run 4 passes due to PostgREST 1000-row cap).
- Rewrote both bodies to drop visible URL text: "The energy of the evening is captured in my concert trailer, watch it below."
- Re-fired cleanly.

### Wave 3 partial fire + recovery (2026-05-31)
Scheduler crashed at chunk 10's bulk-tag step on invalid email `ryahn.vehra#@gmail.com` (`#` invalid in local part). Chunks 1-10 already scheduled. Recovery via:
- `_work/resume-w3-chunks-11-12.ts` - filtered invalid emails, backfilled chunk 10's bulk-tag, scheduled chunks 11+12 at 09:40 and 09:44 UTC.
- `_work/resume-w3-stragglers.ts` - audience-rebuild discrepancy left 224 c-arm stragglers (audience JSON was rebuilt mid-campaign with different hash distribution). Scheduled as chunk 13 c #7 at 09:48 UTC.

**Deferred fix:** The main scheduler `_work/schedule-belgium-trailer-ab.ts` does NOT have the invalid-email regex pre-filter yet. Backport from `_work/resume-w3-chunks-11-12.ts` before next bulk send.

## Open tracking gaps

These are known issues that should be fixed before the next major send:

1. **`subscriber_events` opens have `user_agent=null`**. Only click events capture UA. Limits mobile/desktop breakdown to clickers only. Fix in `dreamplay-email-2/app/api/track/open/*` (separate repo).
2. **No Shopify→email-subscriber purchase attribution.** Currently manual cross-reference. Adding a webhook from Shopify orders into a `belgium_purchases` table joined on canonical email + cid query param would automate the conversion funnel. Worth doing before the next major concert announcement.
3. **xlsx unsub lists at `docs/More Unsubscribed Emails Delete.xlsx` and `docs/Unsubscribed Emails To Delete Omnisend.xlsx` were rejected** as exclusion sources (only 14 of 5,349 verifiably bad). Documented at `_work/analyze-xlsx-unsubs.py` + `_work/xlsx-unsub-analysis.json`. Do not re-treat as authoritative.

## Code changes this session

| Change | Where |
|---|---|
| Cross-workspace non-active exclusion in audience build | `_work/build-trailer-audience.py:326-372` (line range approximate, look for `load_supabase_excluded`) |
| HARD_EXCLUDE set across all sources (8 Test Accounts) | `_work/build-trailer-audience.py:70-79` |
| Wave 3 scheduler with per-arm subjects | `_work/schedule-belgium-trailer-w3-c-vs-short.ts` |
| Invalid email regex (resume scripts only - NEEDS BACKPORT) | `_work/resume-w3-chunks-11-12.ts`, `_work/resume-w3-stragglers.ts` |
| Belgium logistics audience build (geo-filtered) | `_work/build-logistics-audience.py` |
| YouTubeFacade now supports `start` prop | `belgium-concert-landing-page/src/components/youtube-facade.tsx` |
| 3 new viral-video LPs created then unused | `belgium-concert-landing-page/src/app/{moonlight-sonata-nightmare,12-levels-of-beethoven,still-dre}/page.tsx` |
| Concert trailer page autoplay round-trip | `belgium-concert-landing-page/src/app/concert-trailer/page.tsx` |
| Trailer video swap (`wQYhjQ8Ibls?t=24`) | `belgium-concert-landing-page/src/app/concert-trailer/page.tsx` |

## Docs created this session

- [CAMPAIGN-3-TRAILER-RESULTS.md](CAMPAIGN-3-TRAILER-RESULTS.md) - full trailer A/B writeup with findings + next experiments (committed 1513f03)
- [SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md) - 3 new entries for trailer W1/W2/W3 (committed 20baf9a, cb67100, 45e9562)
- `_work/weekend-emails-showcase.html` - all 4 emails rendered side-by-side via iframes (local only, gitignored)
- `_work/weekend-emails-stats.md` - per-email metrics doc (local only, gitignored)

## Commits this session

```
1513f03 docs(c3): trailer A/B 3-wave results, Short+C wins, next experiments
45e9562 docs(audit): trailer A/B wave 3 SAFE verdict, Short vs C head-to-head 13 children fire 09:00Z-09:48Z May 31
cb67100 docs(audit): trailer A/B wave 2 SAFE verdict, 8 children fire 16:30Z-17:00Z May 30
20baf9a docs(audit): trailer A/B wave 1 SAFE verdict, 16 children fire 14:00Z-15:00Z May 30
```

Plus LP repo commits:
```
eebb8c2 feat(concert-trailer): swap embedded video to wQYhjQ8Ibls?t=24
3dfd0e0 feat(concert-trailer): switch to wQYhjQ8Ibls trailer starting at 0:24
075bec4 revert(concert-trailer): back to click-to-play facade (unmuted on click)
33c2469 feat(concert-trailer): autoplay (muted) trailer on page load
44be5d7 tweak(concert-trailer): 'select' -> 'lucky' group on CTA
c948caa feat(viral-videos): add LPs for Moonlight Nightmare, 12 Levels Beethoven, Still Dre
9927647 feat(concert-trailer): add LP for email trailer CTA tracking
```

## Suggested first moves next session

1. **Get user sign-off on Belgium logistics send** (drafted but not scheduled). Recommend tomorrow 09:00 UTC = 5am EDT 2026-06-03. Audience 1,964, single-arm send, ~8 chunks.
2. **If approved:** write the scheduler (model on `_work/schedule-belgium-trailer-w3-c-vs-short.ts`, simplified to single arm), spawn send-safety-auditor, fire.
3. **Backport invalid-email regex** to main scheduler before any future bulk send.
4. **Consider engagement-based filter** for the next non-Belgium send. W3 Short opens 30.95% vs W1+W2 Short 35.13% on identical content - the long-tail audience is dragging down rates. A simple cut: exclude anyone with no opens in last 180 days.

## Audience numbers reference

- Trailer audience (built 2026-05-30, post cross-workspace fix): 2,883 candidates remaining after waves 1+2 done-tagged 5,976
- Logistics audience (built 2026-06-02, Belgium-region only): 1,964 candidates
- Master Supabase active musicalbasics: 7,950 (as of 2026-05-30 18:00Z)
- Cross-workspace non-active (all workspaces, dedup'd): 703-833 depending on query time

## Constants reference

- Email Supabase project: `quyqwdjygzalqqmrgkfk`
- Analytics Supabase project: `tqhfpcdqxylrknwbrqqi` (concert_analytics, musicalbasics_analytics, dreamplay_analytics schemas)
- Tickets/concert business Supabase project: `szlagsmxgfsobizzxaog` (do NOT use for email)
- Variant B parent template: `db10a687-4233-4313-8431-8d2fa64a15c4`
- Source campaign for image vars: `f2b25235-902b-4e74-8d52-eaea4917059b`
- Test Account (Lionel) sub ID: `131648eb-c9a2-462f-bbde-eb63ffd0e9e8`
- Resend rate limit: 5 req/s (200ms throttle per recipient)
- Vercel maxDuration: 300s on `send-stream`
- Conservative chunk size: 250 (gives ~25% headroom against maxDuration)
- Stagger between children: 240s (acceptable under global send-lock)
- Trailer video ID (current on LP): `wQYhjQ8Ibls` starting at 24s
- Bandsintown UTM source: `utm_source=bandsintown&utm_medium=email&utm_campaign=belgium-2026-06-11`
