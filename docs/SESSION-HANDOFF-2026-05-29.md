# Session handoff — 2026-05-29

This continues from [SESSION-HANDOFF-2026-05-27.md](SESSION-HANDOFF-2026-05-27.md). Two sessions of intense Belgium-concert outreach + organizational infrastructure work. Concert is **13 days away** (Thursday June 11 2026 at Theaterzaal Maupertuis, CC De Factorij, Zaventem).

## TL;DR for next-Claude

- **6 batches fired** over ~30h across Benelux/FR-N/UK/DE: 209 + 41 + 18 + 132 + 160 + 160 + 131 = **851 emails total** (the 209 was yesterday's prospect bulk, the rest spanned 2026-05-27 evening → 2026-05-28 morning).
- **Benelux+FR-N pool is fully exhausted** across Shopify + Omnisend + Wix + Supabase active subs. Anyone in that geography who hasn't received a Belgium concert email is either (a) explicitly unsubscribed, (b) on no list, or (c) tagged `done-belgium-*`.
- **UK + Germany extended** by Lionel's standing-exception widening on 2026-05-28 (see [CLAUDE.md](../CLAUDE.md) Audience filtering section). Strongest UK CTR 3.0%, DE underperformed at 0.9% and produced 4 of the 8 unsubs across the day.
- **New: SQLite staging-DB pattern** under [_work/lists/](../_work/lists/) for ingesting old contact lists pre-Supabase-merge. Built importers + shared schema + tag namespace. Wix list imported successfully. Two more old lists are pending per Lionel.
- **New: consent policy** documented in [CLAUDE.md](../CLAUDE.md) — Benelux+N-France+UK+Germany may include `consent:none` for this campaign only. NOT a precedent for general newsletter.
- **New: dashboard naming convention** `belgium-2026-06-11 / batch-N <description> / <fire-time>` for all campaign clones so the dashboard groups by goal.
- **Organic conversion proof points**: Diana Krilova (UK consent:none, signed up via Shopify, bought VIP same day, never emailed by us) + `jacobsolaf@gmail.com` (just bought, not in any of our sources). Belgium landing page is converting on its own beyond email.

## The 6 batches in detail

| # | Label | Audience | Sent | Subject | When (UTC) | Campaign ID |
|---|---|---|---|---|---|---|
| 1 | Prospect bulk | Shopify BE/NL/LU/FR-N (per-recipient personalized, A/B venue framing) | 204+5 canaries | `I'm playing a concert in Brussels (June 11)` | 2026-05-27 10:10-10:23 | 204 child campaign IDs in `_work/bulk-send-belgium-prospects.recovery.jsonl` |
| 2 | Batch-2 Shopify Benelux | 41 Shopify Benelux (May 9 polished body) | 41 | `My upcoming concert in Belgium` | 2026-05-27 18:32 | `ba6a6cb2-d9d3-4f53-9b82-34ae5361ebd7` |
| 3 | Batch-3 last-call subs | 18 active Benelux Supabase subscribers ("14 days until Belgium" angle) | 18 | `14 days until Belgium` | 2026-05-28 06:00 | `2c01d674-857c-4421-ada9-94c69240dc7c` |
| 4a | Batch-4 UK | 132 UK Omnisend+Shopify (May 9 polished + GETTING THERE travel block) | 132 | `My upcoming concert in Belgium` | 2026-05-28 09:00 | `1fa1be6a-31c7-4d18-8fcc-c4f8b0982577` |
| 4b | Batch-4 DE-1 | 160 DE half-1 | 160 | same | 2026-05-28 09:05 | `ac3f9702-d342-4232-9b64-f104d3164abd` |
| 4c | Batch-4 DE-2 | 160 DE half-2 | 160 | same | 2026-05-28 09:10 | `d91ca75c-9d27-41eb-b484-27286434f86d` |
| 5 | Batch-5 Wix Benelux+FR-N | 131 Wix-era customers (May 9 polished, no Wix mention, no travel block) | 131 | `My upcoming concert in Belgium` | 2026-05-28 09:20 | `0e321f6e-6c9b-4adc-bde8-b8e3d176c3c9` |

All 6 batches confirmed `status=completed`, `scheduled_status=sent`, 0 bounces. Done-tags: `done-shopify-benelux-prospect-2026-05-27`, `done-belgium-batch-2-2026-05-27`, `done-belgium-batch-3-last-call-2026-05-28`, `done-belgium-batch-4-uk-de-2026-05-28`, `done-belgium-batch-5-wix-2026-05-28`.

## Engagement / intent ranking (as of 2026-05-29 00:09 UTC, ~15-38h post-fire)

| Batch | Sent | Open % | Gmail open % | Click | **CTR** | Unsub |
|---|---:|---:|---:|---:|---:|---:|
| Batch-2 Shopify Benelux | 41 | 41% | 56% | 3 | **7.3%** | 1 |
| Prospect bulk (yest 209) | 209 | ~25% | ~25% | 8 | **3.8%** | 4 |
| Batch-4 UK | 132 | 23% | 24% | 4 | **3.0%** | 2 |
| Batch-5 Wix Benelux+FR-N | 131 | 18% | 16% | 2 | **1.5%** | 1 |
| Batch-4 DE-2 | 160 | 18% | 16% | 2 | 1.25% | 1 |
| Batch-4 DE-1 | 160 | 23% | 22% | 1 | 0.6% | 3 |
| Batch-3 Benelux subs (last-call) | 18 | 33% | 38% | 0 | 0% | 0 |
| **TOTAL** | **851** | ~22% | ~23% | **20** | ~2.3% | 12 |

**Lionel's Wix-is-weaker prediction confirmed**: 7.3% recent-Shopify vs 1.5% Wix-era = ~5x decay. Acknowledged in batch-5 design but not as a copy angle (Lionel chose to send the standard "My upcoming concert" email rather than acknowledge the gap explicitly).

**Germany underperforms**: 0.9% combined DE CTR, half of all day's unsubs from there. Recommendation in handoff text — DON'T extend consent:none policy beyond BE/NL/LU/FR-N/UK/DE per [CLAUDE.md](../CLAUDE.md).

## What was NOT addressable — gaps to fix later

**Time-on-site / engagement-depth tracking for belgium.musicalbasics.com landing page**: the `@dreamplay/analytics` package wired to `/api/track` is supposedly writing to a `dp_analytics_events` table but **none of the 3 Supabase projects expose such a table**:
- EMAIL (`quyqwdjygzalqqmrgkfk`): only `subscriber_events`
- ANALYTICS (`tqhfpcdqxylrknwbrqqi`): has `analytics_logs` (DreamPlay keyboard product only, 0 belgium events in 36h)
- TICKETS (`szlagsmxgfsobizzxaog`): mirrors the email schema but no analytics tables

Either the handler is silently failing on POST, or it writes to a fourth project we haven't accessed. Verify by checking Vercel function logs for the belgium-concert-landing-page `/api/track` deploy.

## New infrastructure built this session

### SQLite staging databases for old contact lists

Location: [_work/lists/](../_work/lists/) (gitignored — PII). Shared schema:

```sql
CREATE TABLE contacts (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT, last_name TEXT,
  country TEXT, city TEXT, zip TEXT,
  date_added TEXT, status TEXT,
  tags TEXT,                   -- JSON array
  source TEXT NOT NULL,
  source_list TEXT NOT NULL,
  raw_metadata TEXT            -- JSON blob, source-specific
);
```

Two DBs imported today: `shopify-orders-2026-05-27.db` (4,254 customers) and `omnisend-2026-05-27.db` (8,228 contacts). Wix list pulled inline into `_work/wix-benelux-fr-n-net-new.json` but full Wix DB not yet built. Importer script: [_work/build-contact-staging-dbs.py](../_work/build-contact-staging-dbs.py). Cross-DB queries via SQLite `ATTACH` work cleanly.

Tag namespace:
- `source:` — `shopify-customer` / `omnisend-contact`
- `consent:` — `marketing` / `none` / `revoked`
- `geo:` — `belgium` / `netherlands` / `luxembourg` / `france` / `fr-north` / `fr-hauts-de-france` / `fr-grand-est` / `fr-idf-paris` / `fr-normandie` / `germany` / `uk` / `usa` / etc.
- `purchased:` — `belgium-ticket-in-person` (7) / `belgium-livestream` (15)
- `bought:` — `moonlight-nightmare` (694) / `fur-elise-nightmare` (538) / `beethoven-virus` (432) / `still-dre` (391) / `water-flower` (486) / etc.
- `omni:` — preserves original Omnisend tags verbatim

Full doc in [_work/lists/README.md](../_work/lists/README.md) (gitignored).

### Omnisend bot cleanup (498 carding-bot rows removed)

Discovered Omnisend list had 498 carding-bot signatures across 4 patterns:
1. Long-gibberish-name + shopify-only + non-sub (389)
2. Newsletter-form pair `emmawatson_9912` + `dolfziggler790` (2)
3. Blank-everything + shopify-only post-Dec-25 (77)
4. Manual scrub of katlin Gmail-dot-trick + joonix disposables + valnere cluster + May 7-13 common-name burst (30)

Bot patterns + heuristic documented inline. True organic Omnisend growth is ~45-80/month (vs the dirty list showing 130-180/month). Cleaned CSV saved as `omnisend list 2026 CLEANED.csv` at repo root (gitignored). Audit at `_work/omnisend-bots-removed-2026-05-27.csv`.

**Root cause**: Shopify checkout / account-registration bot abuse, NOT card-testing (Lionel verified 0 fraud orders since manual capture enabled Jan 1 2026). Recommendation in chat: enable Shopify Bot Protection + Cloudflare Bot Fight Mode + consider disabling self-service customer accounts.

### Standing consent policy (committed)

[CLAUDE.md](../CLAUDE.md) "Audience filtering → Consent policy for Belgium concert outreach (Benelux + N-France + UK + Germany)" — set 2026-05-27, extended 2026-05-28. Include `consent:none` in `geo:{belgium|netherlands|luxembourg|fr-north|uk|germany}` UNLESS `consent:revoked` or Supabase status non-active. NOT a precedent for general newsletters. NOT a precedent for further geographic expansion.

### Campaign naming convention

`belgium-2026-06-11 / batch-N <description> / <fire-time>` so the dashboard groups all sub-sends under one goal prefix. Used for batch-4 and batch-5 campaign rows. Older batches don't follow this; nothing requires retroactive rename.

### Audience query shortcut

For "anyone in Benelux+FR-N+UK+DE not yet hit and consent-eligible":

```sql
ATTACH 'shopify-orders-2026-05-27.db' AS sh;
ATTACH 'omnisend-2026-05-27.db'        AS om;
-- Cross-DB union, then exclude already-sent + Supabase non-active + consent:revoked
```

Working script template: [_work/schedule-belgium-batch-5-wix.ts](../_work/schedule-belgium-batch-5-wix.ts). Pattern is: ensureSubscriber → clone VARIANT_B → patch html_content+subject_line+variable_values → POST /send with scheduledAt → bulk-tag DONE.

## Email body assets

Three distinct bodies in active rotation:

| File | Used for | Subject |
|---|---|---|
| [_work/belgium-campaign-2-may9.html](../_work/belgium-campaign-2-may9.html) | batch-2, batch-5 | `My upcoming concert in Belgium` |
| [_work/belgium-batch-3-last-call.html](../_work/belgium-batch-3-last-call.html) | batch-3 only | `14 days until Belgium` |
| [_work/belgium-batch-4-uk-de.html](../_work/belgium-batch-4-uk-de.html) | batch-4 UK+DE-1+DE-2 | `My upcoming concert in Belgium` (with GETTING THERE travel block) |

All three pull `logo_src` / `hero_img` etc. from source campaign `f2b25235-902b-4e74-8d52-eaea4917059b` (May 9 polished parent).

## Open items / next-steps

1. **Two more old lists** pending per Lionel — only Wix has been ingested so far. He mentioned more old lists to deliver. When they arrive, follow the same SQLite staging pattern.
2. **Post-concert merge** — after June 11, plan is to load all `_work/lists/*.db` + dedupe by canonical email + upsert into Supabase `subscribers` with `imported-from:<list-name>` provenance tags. Script outline in [_work/lists/README.md](../_work/lists/README.md).
3. **Time-on-site instrumentation** — diagnose why `dp_analytics_events` isn't being populated for belgium.musicalbasics.com. Either fix the handler or add minimal session tracking.
4. **Don't extend geo further** — DE results indicate diminishing returns. Italy/Spain/Eastern Europe should stay on `consent:marketing` only.
5. **Wix-era cohort** needs a different angle for future cohorts — 1.5% CTR is too low. Try gap-acknowledgment + sweetener (early-bird code, livestream-included).
6. **Audience-builder UI** (still recommended, not built) — to replace ad-hoc Python scripts for each send.

## Commits made this session

- `1788c5f` docs(audience): consent policy for Belgium concert outreach
- `9bfb886` docs(audience): extend Belgium concert consent exception to UK + Germany + gitignore PII

Both pushed to `main` (production deploys).

## Key files / paths for next-Claude

- [CLAUDE.md](../CLAUDE.md) — read the new Consent policy subsection first
- [_work/lists/](../_work/lists/) (gitignored) — staging DBs
- [_work/build-contact-staging-dbs.py](../_work/build-contact-staging-dbs.py) — importer
- [_work/bulk-send-belgium-batch-2.ts](../_work/bulk-send-belgium-batch-2.ts) — single-campaign send pattern (proven)
- [_work/schedule-belgium-batch-3-last-call.ts](../_work/schedule-belgium-batch-3-last-call.ts) — scheduled-send pattern
- [_work/schedule-belgium-batch-4-uk-de.ts](../_work/schedule-belgium-batch-4-uk-de.ts) — multi-split staggered pattern
- [_work/schedule-belgium-batch-5-wix.ts](../_work/schedule-belgium-batch-5-wix.ts) — most recent template
- [docs/SEND-AUDIT-LOG.md](SEND-AUDIT-LOG.md) — should be updated for batch-2/3/4/5 (NOT yet logged)

## Constants reference

- Email Supabase project: `quyqwdjygzalqqmrgkfk`
- Concerts (TICKETS) Supabase project: `szlagsmxgfsobizzxaog` (parallel email schema, do NOT use for email tracking)
- DreamPlay analytics Supabase project: `tqhfpcdqxylrknwbrqqi` (`analytics_logs` table, keyboard product only)
- Variant A parent template: `b04a217d-7855-447e-9b29-fa25b50802a0`
- Variant B parent template: `db10a687-4233-4313-8431-8d2fa64a15c4`
- May 9 source campaign (image URLs reused): `f2b25235-902b-4e74-8d52-eaea4917059b`
- Lionel Test Account subscriber id: `131648eb-c9a2-462f-bbde-eb63ffd0e9e8`
- Resend rate limit: 5 req/s
- Vercel maxDuration on send-stream: 300s (capacity for ~300 recipients per child campaign at 1s wall-clock each)
- Venue capacity: 60 seats (internal Shopify cap) / 679 seats (true CC De Factorij capacity)
- Concert: Thursday 2026-06-11 19:30 CEST, Theaterzaal Maupertuis, Willem Lambertstraat 10, 1930 Zaventem

## Bonus signal: organic conversion is real

- Diana Krilova (UK, `consent:none`, never emailed) — signed up via Shopify 2026-05-27, bought VIP same day
- `jacobsolaf@gmail.com` — just bought (per Lionel 2026-05-29), 0 trace in any of our 5 contact sources
- These suggest the belgium.musicalbasics.com page + whatever upstream channel (Google? social? word of mouth?) is doing meaningful work independent of email
- Worth investigating once analytics instrumentation is fixed
