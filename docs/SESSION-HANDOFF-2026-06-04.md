# Session handoff — 2026-06-04

Concert is **Thu 2026-06-11**, 7 days out.

## TL;DR for next Claude

1. **Six checkout-recovery emails fire at 8am EDT today (2026-06-04T12:00–12:05Z)** to European abandoners. Tag `done-checkout-recovery-2026-06-04` applied. No action needed unless replies come in or you need to send more rounds.
2. **OPQ (non-local) campaign is fully sent** — 2,000 (Jun 3) + 4,370 (Jun 4) = 6,370 total. **0 confirmed conversions** attributable to email. The funnel breaks at Shopify checkout, not at email or LP.
3. **LMN (local) campaign is fully sent** — 2,079. **0 confirmed conversions** attributable to email.
4. **The Shopify checkout always opens with locale `en-AT`** (Austrian English). Country pre-fill patch deployed (commit `0eb07e8` on LP repo) — `?country=XX` is now appended to every cart URL. But Shopify Markets must be configured in the Shopify admin for the pre-fill to actually take effect; otherwise it falls back to `en-AT` and the country attribute lands only on the order record.
5. **send-wave SDK** at `src/lib/send-wave/` is the canonical scheduler now — do not model on the pre-2026-06-03 `_work/schedule-*.ts` boilerplate (~280 lines). New schedulers should be ~30 lines using `runWaveSend()`. See `_work/schedule-belgium-livestream-opq.ts` for the canonical example.

## What shipped this session

### Sends fired

| Date | Send | Recipients | Done-tag | Status |
|---|---|---:|---|---|
| 2026-06-03 06:00Z | LMN local logistics (3 arms) | 2,079 | `done-belgium-logistics-2026-06-02` | drained 06:36Z |
| 2026-06-03 11:00Z | OPQ first non-local livestream (3 arms) | 2,000 | `done-belgium-livestream-2026-06-03` | drained 11:36Z |
| 2026-06-04 08:00Z | OPQ remainder non-local (3 arms) | 4,370 | `done-belgium-livestream-2026-06-03` | drained 09:12Z (crashed mid-flight at wave 11, recovered) |
| 2026-06-04 12:00Z | Checkout-recovery (6 European abandoners) | 6 | `done-checkout-recovery-2026-06-04` | scheduled (fires after this handoff is written) |

### Code shipped

| Repo | Commit | What |
|---|---|---|
| dreamplay-email-3 | `6ba38fc` | `src/lib/send-wave/` SDK — 10 modules, ~600 lines, replaces ~280-line scheduler boilerplate |
| dreamplay-email-3 | `a183565`, `1510fb3`, `c4124a4`, `429275e` | SEND-AUDIT-LOG entries for LMN, OPQ first, OPQ remainder, checkout-recovery |
| belgium-concert-landing-page | `695b094` | `?country=XX` injection into cart URLs + middleware (broke build — Next 16 forbids both middleware.ts and proxy.ts) |
| belgium-concert-landing-page | `0eb07e8` | Fix: fold dp_country cookie logic into existing `src/proxy.ts`; delete middleware.ts; expand matcher to cover all routes |

### Audience-side artifacts (all in `_work/`, gitignored)

- `build-nonlocal-audience.py` — TARGET_SIZE bumped from 2000 to 999999; outputs `nonlocal-audience.json` (4,372 after dedup)
- `split-opq-audience.py` — now canonical-dedupes first (fix from auditor catching 2 Gmail dot/+tag collisions across P and Q)
- `audience-variant-{o,p,q}.json` — current state has the REMAINDER split (~1457/arm), not the first-fire split. If you need the first-fire roster, rebuild from sent_history.
- `checkout-recovery-roster.json` — 6 European abandoners with first names from Shopify billing
- `recovery-email-template{,-multi}.html` — support-tone copy, 2 paths back (Shopify cart with country pre-fill + LP arm), no CC De Factorij external link

## Open issues / deferred fixes

1. **Funnel breaks at Shopify checkout.** Across 8,449 recipients (LMN + OPQ), the LP analytics captured 5 unique email-attributed begin_checkouts but 0 confirmed conversions. The paid-ad buyers (rebelo, raluca_s, and the cebussmann livestream — none of which came via our email channel) DO complete. So the funnel works for paid traffic but not for email traffic. Possible causes: list-quality issue, $5 vs €29 perceived-value mismatch, Shopify checkout friction on mobile, en-AT default confusing non-Austrian buyers. Worth diagnosing before the next email round.

2. **Shopify Markets isn't configured.** The store has one effective market (default → en-AT). `?country=XX` is acknowledged by Shopify but only partially applied — the country attribute lands on the order record but checkout still opens in en-AT. To get full country pre-fill behavior, add markets in Shopify Admin → Markets (top-level nav, NOT under Settings in 2024-2025 admin UI). The LP-side patch is no-op until Markets is configured but it's already deployed and ready.

3. **Agent API returning intermittent 500s.** Today's OPQ remainder scheduler crashed at wave 11 on a `bulk-tag` 500. Recovered via `_work/resume-opq-remainder-chunks-12-18.ts`. Should add retry-on-5xx to `src/lib/send-wave/api-client.ts`. Right now any 5xx aborts the whole send.

4. **No completed-purchase signal anywhere we can query.** `ticket_orders` table referenced by `src/lib/db/tickets.ts` doesn't exist on the `TICKETS_SUPABASE_URL` Supabase project (only email-system tables there). `begin_checkout` is the closest signal we have. To attribute completed purchases to email arms, you have to manually cross-reference Shopify Admin orders against our subscribers DB by canonical email. That's how we confirmed the 4 LP-side BC buyers DIDN'T complete (Lionel confirmed in conversation).

5. **The "2 livestream purchases" Lionel mentioned remains partly ambiguous.** Rebelo bought 2 tickets but those were General Tickets (in-person), not livestream — confirmed via Shopify abandoned-checkout CSV which shows rebelo with `General Ticket` line items. The cebussmann begin_checkout from arm O was for `livestream` ($5) — if they completed, that's 1 livestream sale. The "other" livestream sale (if there were 2) hasn't been identified in any data we can query.

6. **Variant N has a "string section" line** that went out to 691 recipients on 2026-06-03. We only have a violinist + cellist. Unrecallable. Variant Q's identical line was caught and fixed before the OPQ fire. Memory `feedback_fact_check_marketing_claims.md` written so next session scans for similar inherited copy claims before forwarding.

## What's in your memory

Per-project memory at `~/.claude/projects/-Users-lionelyu-Documents-DreamPlay-Repos-dreamplay-email-3/memory/`:

- `feedback_no_em_dashes.md` — never use em dashes
- `feedback_verify_current_time.md` — always `date -u` before scheduling
- `feedback_stagger_concurrent_sends.md` — never overlap sends
- `feedback_gmail_only_honest_metric.md` — Gmail opens are the only non-MPP signal
- `feedback_youtube_clicks_not_tracked.md` — append-mode doesn't capture YouTube clicks
- `feedback_fact_check_marketing_claims.md` (NEW today) — scan inherited copy for production claims (multi-cam, string section, ensemble) before sending
- `reference_subscribers_location_columns.md` — country_code is the primary column (~5.3k populated), country is sparser (~3.8k)
- `reference_enrichment_tags.md` — enriched:* tags mark country_code rows backfilled from non-signup signals
- `reference_send_wave_sdk.md` — use runWaveSend() from src/lib/send-wave for new schedulers; don't model on pre-2026-06-03 _work/schedule-*.ts

LP repo memory at `~/.claude/projects/-Users-lionelyu-Documents-New-Version-belgium-concert-landing-page/memory/`:

- `feedback_no_em_dashes.md`
- `feedback_auto_push.md`
- `reference_shopify_markets_pricing.md`
- `reference_proxy_not_middleware.md` (NEW today) — Next 16 renamed middleware to proxy; don't add src/middleware.ts, edit src/proxy.ts

## Watch list for the next session

1. **Replies to the 6 recovery emails** (fires at 12:00–12:05Z). Most actionable signal we'll get. Reply rate is the primary metric.
2. **Any Shopify completed orders against the 6 recovery recipients' emails** (Beerend, vdebaille, Yonic, Rita, Thierry, Paul) — would close the recovery loop.
3. **OPQ remainder Gmail open + click rates at 24h** (now ~5h in). First fire's numbers were tied across arms (~35-36% Gmail opens, 0-1% LP traffic from email per arm). With 3x sample now, see if the pattern holds.
4. **Funnel investigation** — do not fire another big round until we understand why email-driven begin_checkouts don't complete. Options: (a) walk the buy flow on /m as a mobile user, screenshot every step; (b) send the abandoners a "what did you see?" reply; (c) compare paid-ad-buyer journey vs email-buyer journey in analytics_logs.

## How to resume

```bash
cd "/Users/lionelyu/Documents/DreamPlay Repos/dreamplay-email-3"
date -u                                         # standard time check
git log --oneline main -10                      # see what's shipped
cat docs/SEND-AUDIT-LOG.md | head -100          # recent send entries
ls _work/audience-variant-*.json                # last audience splits
ls _work/checkout-recovery-roster.json          # recovery roster
```

For LP-side work:
```bash
cd "/Users/lionelyu/Documents/New Version/belgium-concert-landing-page"
git log --oneline main -10
cat src/proxy.ts                                # request-time logic
cat src/lib/checkout.ts                         # cart URL builder with country support
```
