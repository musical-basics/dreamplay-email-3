# Session Handoff — 2026-05-12

Picked up where the May 8-12 Variant B follow-up campaign work left off. This doc is the first thing the next session should read.

## TL;DR — what's live, what's scheduled, what to know

- **Scheduled to fire shortly**: two batches at `2026-05-12T02:25:00Z` (250 Gmail) and `02:30:00Z` (250 non-Gmail) with subject "My upcoming concert and livestream". `scheduled_status="pending"` on both. Inngest functions queued at those times.
- **Click attribution chain is now live and verified end-to-end** (via iPhone test click landing in `subscriber_events`). Architecture below.
- **Remaining-eligible audience snapshot saved** to `_work/remaining-eligible-2026-05-12.csv` (3,978 subscribers: 2,779 Gmail + 1,199 non-Gmail).
- **Three branches pushed but unmerged** on dp-email-3 from earlier in the week. Production main does NOT have them.

## What's currently scheduled (DO NOT cancel without intent)

| Send | Fires (UTC) | Fires (EDT) | Child Campaign ID | Recipients |
|---|---|---|---|---:|
| 250 Gmail | 2026-05-12T02:25:00Z | 10:25pm May 11 | `ec6bf78f-7fc6-4666-8663-a362b85ac636` | 250 |
| 250 non-Gmail | 2026-05-12T02:30:00Z | 10:30pm May 11 | `068e10f1-4a96-4dbd-b96c-3094a7ddd858` | 250 |

Both use parent template Variant B (`db10a687-4233-4313-8431-8d2fa64a15c4`) with subject "My upcoming concert and livestream". Append-mode click tracking. `Lionel Yu <lionel@musicalbasics.com>` sender.

Manifest: `_work/schedule-250-250-manifest.json`

These were cancelled briefly tonight (user said "pause") and uncancelled (user said "do A"). Both now `scheduled_status=pending` again.

## Click attribution architecture (finally working)

Took several iterations to land. Final state:

1. **Email links use append mode**: `?sid=<sub_id>&cid=<campaign_id>` appended to destination URLs (no redirect wrapper).
2. **Hosted attribution beacon** at `https://email.dreamplaypianos.com/track-attribution.js` (served from `public/track-attribution.js` in `dreamplay-email-2` repo — note: dp-email-2, not dp-email-3, because `email.dreamplaypianos.com` CNAME aliases dp-email-2). Cache-Control: `public, max-age=300`.
3. **Script body uses Image beacon** (`new Image(); beacon.src = ...`) instead of `fetch`. Fetch was being silently blocked by Safari ITP on iPhone. Image beacons bypass CORS, ITP, and tracker blockers.
4. **Landing page** `belgium-concert-landing-page` includes a one-line `<script src="https://email.dreamplaypianos.com/track-attribution.js" async />` in `src/app/layout.tsx`.
5. **Beacon fires** `https://email.dreamplaypianos.com/api/track/click?c=<cid>&s=<sid>&u=<page_url>` cross-origin. dp-email-2's endpoint inserts into `subscriber_events` (table is in the email Supabase project `quyqwdjygzalqqmrgkfk`, the right one for our analytics queries).
6. **Key gotcha**: the landing page's *own* `/api/track/click` endpoint uses its own `NEXT_PUBLIC_SUPABASE_URL` (concert tickets DB `szlagsmxgfsobizzxaog`), so a same-origin fetch would have inserted clicks into the WRONG database. The absolute-URL pattern routes clicks to dp-email-2 where the right Supabase env exists.

Verified live: an iPhone click at 2026-05-12T01:34Z generated a row in `subscriber_events` with `type='click'`. End-to-end working.

### Future landing pages

When you add new landing pages that email links to (e.g., for ultimatepianist.com, concerts.musicalbasics.com), just add the one-line script tag to that repo's layout. Script auto-runs and reports clicks. No package install, no rebuild, no version bumps.

## Branches in flight (across all repos)

### dp-email-3 (current repo)

| Branch | Status | What it does |
|---|---|---|
| `feat/overnight-reconciliation` | Pushed, unmerged | Throttle fix 600ms→100ms + redirect-mode warning + cancel/reactivate endpoints. From May 3 incident. |
| `feat/sequential-send-concurrency` | Pushed, unmerged | Inngest concurrency lock across all 4 send functions + throttle 100ms→200ms. From May 9 rate-limit failure incident. |
| `feat/track-attribution-script` | Merged → squash. | Initial route-handler attempt (didn't route correctly due to `.js` suffix on folder). |
| `fix/track-attribution-routing` | Merged → squash. | Move script to `public/`. Works on `dreamplay-email-3.vercel.app` but the CNAME `email.dreamplaypianos.com` points to dp-email-2 so this doesn't help that URL. |

**Production main (dp-email-3) has only the original throttle, no concurrency lock, no attribution script at email.dreamplaypianos.com.** The two `feat/` branches above with the actual fixes are NOT live in production. If you do another big multi-child send, you MUST stagger scheduledAt times manually (60s+ apart for 250-recipient children) until those branches merge.

### dp-email-2

| Branch | Status | What it does |
|---|---|---|
| `feat/track-attribution-script` | Merged | Add `public/track-attribution.js` + headers in next.config.mjs |
| `fix/script-absolute-url` | Merged | Script POSTs to absolute email-server URL |
| `fix/script-image-beacon` | Merged | Image beacon instead of fetch (Safari ITP fix) |

Production live at email.dreamplaypianos.com.

### belgium-concert-landing-page

| Branch | Status |
|---|---|
| `feat/email-click-attribution-script` | Merged. The `<script>` tag is in `src/app/layout.tsx` on main. |

## Subject line performance (mature data, ~24-72h elapsed)

| Subject | Sent | Open rate | Notes |
|---|---:|---:|---|
| "My upcoming concert and livestream" | 506 (3 children) | **26.7%** | Current winner. Gmail 32.5%, non-Gmail 21.5%. Adds livestream hook = lower activation cost. |
| "My only concert this year" | 400 (4 children, rounds 1+2) | 24.0% | Proven baseline. Balanced both groups. |
| "My only public concert this year" | 147 (R4) | 19.7% | Great on non-Gmail (29.2%), terrible on Gmail (10.7%). |
| "Will I see you in Belgium?" | 147 (R3) | 16.3% | Worst. Non-Gmail 9.9% — question marks tank non-Gmail providers. |

3 unsubs total on the "livestream" subject (hot rate 2.2% on 135 openers) = healthy, no phishing-banner signature.

Parent Variant B template (`db10a687-...`) currently has subject "My upcoming concert and livestream" — last patched 2026-05-11.

## Audience pool state

- Total active musicalbasics subscribers: ~5,730 (as of last full count)
- Tagged `done-belgium-followup-b`: ~1,306 + 500 from cancelled-then-resumed 250/250 = ~1,806 once tonight's send completes
- Tagged `done-belgium-masterclass` (from May 3 Variant A overnight): ~5,722 (essentially everyone)
- **Remaining eligible after tonight (250/250 fires)**: 3,978 untouched — snapshot at `_work/remaining-eligible-2026-05-12.csv`

### Key audience rule (current)

The "past-week non-opener" rule used through May 10 stopped working on May 11-12 because the 7-day window rolled past the May 3 overnight. To get a workable audience size, switched to:

```
active musicalbasics subscribers
  not tagged "Test Account"
  not tagged "done-belgium-followup-b"
```

This is broader than "non-openers" — includes engaged subscribers too. Worth noting for interpretation: open rates from tonight's 250/250 may be higher than previous Variant B sends because the audience isn't filtered to disengaged.

## Critical guardrails learned this session

1. **Resend rate limit on this account is 5 req/s** (verified from 2026-05-09 429 error). Default Pro tier is 10 req/s — this account is at 5. Important for cadence planning.
2. **NEVER schedule multiple Inngest send functions with the same `scheduledAt`** in production. They wake simultaneously and collectively exceed the 5 req/s limit. Result on 2026-05-09 rounds 3+4: 26% of 400 planned sends failed. Always stagger by at least 60s for 100-recipient children, 90s+ for 500-recipient children. (`feat/sequential-send-concurrency` branch fixes this with an Inngest concurrency lock — but unmerged.)
3. **Production code on dp-email-3 main still has 600ms per-recipient throttle** (not the 200ms fix). 500-recipient batches still fit in the 300s `maxDuration` window but at the low end.
4. **Sender domain reputation at Gmail is slowly recovering** from the May 3 incident (cadence-triggered bulk-flagging on the 10x500 overnight). Mature data shows acceptable open rates but not back to slot-1's 51%. Continue with conservative cadence.

## Memory rules updated this session

- `feedback_verify_current_time.md`: always run `date -u` before scheduling — system reminders have been wrong multiple times
- `feedback_stagger_concurrent_sends.md`: never use the same scheduledAt for 2+ send children; stagger sequentially

## What to do next (suggested)

1. **Tomorrow morning (around 9am EDT / 13:00Z May 12)**: pull post-fire stats for the 250/250. Expected at full maturity:
   - Gmail: ~30-33% open rate
   - non-Gmail: ~18-22% open rate
   - Total ~25% combined
2. **Consider merging the two unmerged dp-email-3 branches**:
   - `feat/overnight-reconciliation` (timeout fix, redirect warning, cancel/reactivate)
   - `feat/sequential-send-concurrency` (concurrency lock, 200ms throttle)
   - Both have been ready for days. Currently no concurrent fires planned so the gap is OK, but merging removes the manual-stagger requirement.
3. **Plan further follow-up sends**: 3,978 eligible remaining. At 500/day with safe cadence, that's ~8 days. Could speed up if Gmail reputation is solid. The "livestream" subject is the proven winner; safe to keep using.
4. **Optional**: add the same `<script src>` tag to other landing pages (ultimatepianist.com / concerts.musicalbasics.com) so clicks to THOSE destinations also get attributed. Just one line per repo's layout.

## File / ID reference

Helpful constants for the next session:

- musicalbasics workspace: `musicalbasics`
- Variant A parent template: `b04a217d-7855-447e-9b29-fa25b50802a0`
- Variant B parent template: `db10a687-4233-4313-8431-8d2fa64a15c4`
- Belgium A/B rotation: `dc3e09b3-7bfa-440c-a4cf-31e0f9afadb5`
- Resend rate limit: 5 req/s
- Vercel max duration on send-stream: 300s
- Idempotency tag for Variant B: `done-belgium-followup-b`
- Idempotency tag for Variant A: `done-belgium-masterclass`
- Email Supabase project: `quyqwdjygzalqqmrgkfk` (where subscriber_events lives)
- Concert tickets Supabase project: `szlagsmxgfsobizzxaog` (do NOT use for email tracking)

Manifests (gitignored under `_work/`):

- `_work/overnight-manifest.json` — May 3 overnight 10-batch Variant A schedule
- `_work/ab-test-100-100-manifest.json` — rounds 1+2
- `_work/ab-test-round-2-manifest.json` — round 2 of follow-up
- `_work/ab-test-rounds-3-4-manifest.json` — rounds 3+4 with subject A/B
- `_work/round-5-rescue-106-manifest.json` — the 106-failure rescue + rounds-3+4 retry
- `_work/round-5-and-200-200-manifest.json` — May 10 rescue + 200/200
- `_work/schedule-250-250-manifest.json` — the May 12 250/250 (cancelled, uncancelled)
- `_work/remaining-eligible-2026-05-12.csv` / `.json` — current pool snapshot

## Key check / diagnostic scripts in `_work/`

- `check-all-rounds.ts` / `check-all-sends-with-new.ts` — comprehensive open-rate + by-subject + by-group view across all rounds
- `check-overnight-by-provider.ts` — Gmail vs non-Gmail vs Apple vs Microsoft breakdown
- `check-overnight-uniques.ts` — per-batch unique opens + click totals
- `recent-all-events.ts` — last 15 min of any subscriber_events activity (good for debugging)
- `check-test-events.ts` — events for the latest test campaign
