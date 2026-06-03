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

## 2026-06-03 early morning, Belgium logistics L/M/N 3-way variant test: 9 children, 693/arm (Send 78-86)

**Planned**: First post-trailer Belgium-region followup. Three parallel arms (L, M, N), each pairing an email variant with a matching landing-page variant on `belgium.musicalbasics.com`. Goal: pinpoint which combination of email-framing and LP layout converts BENELUX/UK/DE recipients best for the June 11 concert.

**A/B/C variable**: full email + full LP per arm (NOT a controlled-variable test, this is intentionally messy).
- L: `_work/variant-l-final.html`, subject "Brussels in 9 days. Only ~60 tickets left." → `https://belgium.musicalbasics.com/l` (Gemini Deepthink local logistics page)
- M: `_work/variant-m-final.html`, subject "You're close enough to be there. Belgium, June 11." → `https://belgium.musicalbasics.com/m` (ChatGPT page)
- N: `_work/variant-n-final.html`, subject "For one night, I'm playing live in Zaventem." → `https://belgium.musicalbasics.com/n` (Claude page)

All 3 emails carry `utm_source=musicalbasics&utm_medium=email&utm_campaign=belgium-2026-06-11&utm_content=variant-{l,m,n}-{logo,hero,cta,official}` so LP-side analytics can attribute back to arm.

**Audience**: 2,079 unique canonical from `_work/build-logistics-audience.py` (Belgium-region geos: BE/NL/LU/UK/DE + N-France). Up 5.8% from the previous run's 1,964 thanks to the 2026-06-02 location enrichment backfill (280 subs got `country_code` + `geo:*` tags from concert LP analytics IP-geo + click-event IP geocode + email-domain heuristic).

**Split**: 693 per arm exactly. BENELUX (BE/NL/LU, 262 total) round-robin balanced per-country across arms; non-BENELUX (DE/GB/FR, 1,817) deficit-filled to lock totals at 693/693/693. Split is deterministic (sorted SHA256 + per-country round-robin for BENELUX, hash-sorted + min-arm assignment for the rest). Script: `_work/split-lmn-audience.py`.

- L: 693 (88 BENELUX: 25 BE / 58 NL / 5 LU; 370 DE; 204 GB; 31 FR)
- M: 693 (88 BENELUX: 25 BE / 58 NL / 5 LU; 356 DE; 217 GB; 32 FR)
- N: 693 (86 BENELUX: 24 BE / 58 NL / 4 LU; 354 DE; 226 GB; 27 FR)

**Children scheduled (9 total, interleaved L→M→N, 240s stagger)**:

- L1 #1 `57581d19-64b7-4274-aea0-89d424ef2ad5` @ `2026-06-03T06:00:00Z` (250)
- M1 #1 `a3933dd6-224b-4c74-be1b-db6a86ff37ab` @ `2026-06-03T06:04:00Z` (250)
- N1 #1 `b7439d43-8a81-40b5-9a7a-9cc434d215d3` @ `2026-06-03T06:08:00Z` (250)
- L2 #2 `3488c34a-3f4a-434a-b948-7af82a4e6515` @ `2026-06-03T06:12:00Z` (250)
- M2 #2 `2d563ef4-6fca-4ec8-9a49-759d572ae1be` @ `2026-06-03T06:16:00Z` (250)
- N2 #2 `edae9ad0-37e0-46e0-8e04-7a7f4bbaf5ca` @ `2026-06-03T06:20:00Z` (250)
- L3 #3 `36ebb208-341b-434a-a34d-1bf854806281` @ `2026-06-03T06:24:00Z` (193)
- M3 #3 `1c4f6309-7dac-4678-8d56-fe4d32f1e45a` @ `2026-06-03T06:28:00Z` (193)
- N3 #3 `444a80ff-a206-4582-a635-720394dcd956` @ `2026-06-03T06:32:00Z` (193)

Totals: L 693, M 693, N 693 = 2079. First fires 2:00am EDT, last fires 2:32am EDT, last completes ~2:36am EDT.

**Audit at**: `2026-06-03T03:41Z`, ~2h19min before first fire. Auditor used: `send-safety-auditor` subagent.

**Verdict**: `SAFE`. All blocking sections (A idempotency, B throttle, C concurrency lock, E audience filter, E2 scheduledAt fresh, G state guards) PASS. Carried caveats: D (DB UNIQUE on sent_history not live-queried, app-level filter is primary guard) and the same STAGGER_SEC=240 vs per-child ~225s observation as prior waves.

**Caught + fixed during prep**:
1. Variant M had 2 em dashes in original HTML (subject + footer line). Stripped to commas. Variant M also had `LANDING_PAGE_URL` placeholder unresolved and no actual unsubscribe link, both fixed before test send.
2. Variant L used Omnisend-style `{{ subscriber.first_name | default: 'Lionel' }}` merge tag (wouldn't resolve in this system). Normalized to `{{first_name}}`.
3. Variant N hero link was the bare `belgium.musicalbasics.com/?utm` (would route to control variant A). Pinned to `/n?utm`.
4. Logistics audience builder previously only checked status on `musicalbasics` workspace. Already fixed in prior session (2026-05-30) to scan all workspaces, that fix is the reason this run dropped 834 cross-workspace non-actives before scheduling.

**Deferred (acknowledged but not addressed this run)**:
1. Scheduler still sends `body.city` to `/api/agent/{ws}/subscribers` but the Zod schema expects `shipping_city`. Zod strips unknown keys silently so no 400, but the city won't persist on the subscriber row. Cosmetic data-fidelity issue, not a send-safety issue. Suggest `body.shipping_city = c.city` next iteration.
2. The invalid-email regex pre-filter from `_work/resume-w3-chunks-11-12.ts` has now been backported into this scheduler (`_work/schedule-belgium-logistics-lmn.ts:91, 145-153`). Should propagate the same fix into any future main-line scheduler.

**Outcome**: TBD. Honest signals to watch at 24-48h:

- **Per-arm OPEN rate (Gmail-only honest)**: hypothesis is roughly equal opens (subjects all action-oriented).
- **Per-arm CTR**: this is where the email-framing layer is tested.
- **Per-arm `/l` vs `/m` vs `/n` LP sessions** (UTM-attributed): pure email→LP funnel.
- **Per-arm in-person ticket purchases**: the headline metric, since this entire send exists because the trailer drove livestream-only purchases (0 in-person from trailer waves).
- **BENELUX subset specifically**: 88/88/86 per arm. If any arm wins on the BENELUX slice, that's the highest-confidence comparison (balanced per-country across arms).

Master log entry: ~2079 subs tagged `done-belgium-logistics-2026-06-02` post-fire. Plus each gets a `belgium-logistics-lmn-2026-06-03:{l|m|n}` arm tag so later analytics can identify who saw which.

---

## 2026-05-31 early morning, Belgium trailer A/B wave 3: 13x250 SHORT vs C head-to-head (Send 65-77)

**Planned**: Wave 3 of the trailer campaign. Pivots the A/B variable from body-length (Short vs Long, waves 1+2) to subject+intro framing: Short (control, "Experience the energy of an evolved piano concert") vs Version C ("Watch my upcoming concert trailer"). Same length, same hero, same LP destination, same CTAs and closing. Only the subject + opening lines change. Hypothesis: action-clarity subject sets clearer expectation and lifts click-through-per-open.

**A/B variable**: subject + opening copy. Body length and CTA unchanged.
- Arm A (Short, control): `_work/belgium-trailer-short.html` with subject "Experience the energy of an evolved piano concert"
- Arm B (Version C): `_work/belgium-trailer-c.html` with subject "Watch my upcoming concert trailer"

**Audience**: 2,883 unique canonical (after cross-workspace non-active exclusion fix). Discovered on 2026-05-30 evening that the prior audience build only checked status on `musicalbasics` workspace; 151 of the wave-1+2 recipients were non-active on `dreamplay_marketing` and hurt sender reputation. Fixed at `_work/build-trailer-audience.py:326-372` to scan all workspaces. Audience dropped from 8931 to 2883.

**Bucket re-purposing**: re-use the existing SHA256-hash split. People who hash to "short" get Short; people who hash to "long" bucket get Version C (long-bucket was untouched on positions 3000+ since waves 1+2 only consumed positions 0..2999). Hash is uniform so the two pools are demographically equivalent random samples.

**Children to audit (13 total)**:

Originally planned 12 children at 09:00-09:44 UTC, but scheduler crashed mid-flight on chunk 10's bulk-tag step due to invalid email `ryahn.vehra#@gmail.com` in audience. Chunks 1-10 already scheduled at that point. Recovery added chunks 11+12 then a chunk 13 for c-arm stragglers (the rebuilt audience had a different hash distribution than the original 8931, so the c-arm pool was larger than the original 1440 cap).

- A1 short #1 `c72959b1-722c-432e-bfe8-eadced4464ec` @ `2026-05-31T09:00:00Z` (250)
- B1 c #1     `e6bcce9c-d7b2-4700-85d0-4b2405715b4f` @ `2026-05-31T09:04:00Z` (250)
- A2 short #2 `092debde-8e74-4be7-82a9-39a5ba148d3c` @ `2026-05-31T09:08:00Z` (250)
- B2 c #2     `2821d281-ff09-45c9-af80-9b4503627971` @ `2026-05-31T09:12:00Z` (250)
- A3 short #3 `c2267747-1091-455e-8a61-5874fa3949da` @ `2026-05-31T09:16:00Z` (250)
- B3 c #3     `2fc3b033-67d0-4c4d-a0c7-61617382baca` @ `2026-05-31T09:20:00Z` (250)
- A4 short #4 `b698b20d-881f-4a1b-8bf9-513fabc511eb` @ `2026-05-31T09:24:00Z` (250)
- B4 c #4     `d3eadd16-2108-4048-a072-a2deb3896ef3` @ `2026-05-31T09:28:00Z` (250)
- A5 short #5 `0ac900a0-9f0a-4b77-b7f8-5448ba035099` @ `2026-05-31T09:32:00Z` (250)
- B5 c #5     `68e3d028-23fa-4871-9d73-819d9a142d15` @ `2026-05-31T09:36:00Z` (249, dropped 1 invalid)
- A6 short #6 `7687efd1-dd56-4ee0-9163-cb7a7c35bf4c` @ `2026-05-31T09:40:00Z` (176)
- B6 c #6     `671b3909-d5d7-419f-a627-1a5dc21129ef` @ `2026-05-31T09:44:00Z` (250)
- B7 c #7 stragglers `7b294b12-adaa-4e4a-95ca-0cc03ec97ef9` @ `2026-05-31T09:48:00Z` (224)

Totals: Short 1426 recipients, C 1973 recipients. C arm is larger than Short due to hash distribution of the rebuilt audience, not by design. A/B comparison still valid (rates compared, not absolute counts).

**Audit at**: `2026-05-30T19:00Z`, ~14h before first fire. Re-audited after script changes (per-arm subject patching, cross-workspace exclusion).

**Verdict**: `SAFE` (all sections PASS, per-arm subject patching verified, cross-workspace exclusion verified). Same carried caveats as waves 1+2: D (DB UNIQUE constraint not re-queried, app-level filter is primary guard) and STAGGER_SEC=240 vs per-child ~225s.

**Mid-flight issue + recovery (not in pre-audit)**: Scheduler crashed at chunk 10's bulk-tag because of an invalid email (`#` in local part). Chunks 1-10 already scheduled successfully (the bad email had failed ensureSub silently so was excluded from chunk 10's send; only the bulk-tag step bombed). Recovery via `_work/resume-w3-chunks-11-12.ts` + `_work/resume-w3-stragglers.ts`:

1. Pre-filter invalid emails in recovery script (regex check before ensureSub and bulk-tag)
2. Manually backfilled chunk 10's bulk-tag (idempotent for already-tagged)
3. Scheduled chunks 11, 12, 13 at 09:40, 09:44, 09:48 UTC
4. All recipients done-tagged

For future runs: should add the email regex pre-filter to the main scheduler too. Noted as a deferred fix.

**Outcome**: TBD. Honest signals to watch at 24-48h:

- **Per-arm OPEN rate (Gmail-only honest)**: hypothesis is C slightly LOWER opens (less curiosity-bait subject) but acceptable trade-off.
- **Per-arm CTR (the key A/B variable here)**: hypothesis is C HIGHER clicks-per-open because subject sets clearer expectation ("you'll click and watch a trailer").
- **Per-arm CTR to `/concert-trailer` specifically**: direct measure of "did they actually watch the trailer."
- **Per-arm UNSUB rate**: should be near identical (body content overlap is high).
- **No regressions expected**: cross-workspace fix should reduce silent bounces.

Wave 3 is the last wave; the remaining audience is exhausted after this. All 8931 - 5976 - 2856 = ~99 (rounding) folks in the original audience are now hit.

Master log entry: ~3000 more rows tagged `done-belgium-trailer-2026-05-30` post-fire. Final total after wave 3: ~8976 unique recipients across the 3-wave trailer campaign.

---

## 2026-05-30 midday, Belgium concert trailer A/B wave 2: 8x250 SHORT vs LONG (Send 57-64)

**Planned**: Second wave of the same body-length A/B test. Wave 1 (4000) fired cleanly at 14:00Z and gave directional Short-wins-opens signal (+4.2pp aggregate, Short wins all 8 paired chunk-vs-chunk comparisons). User wants to widen the sample with another 1k/1k for more confidence before deciding on wave 3. Same subject, same hero, same LP, same email bodies as wave 1, no code changes other than `SUBSAMPLE_PER_ARM` 2000 to 1000 and `SCHEDULED_FIRST_FIRE` 14:00Z to 16:30Z.

**A/B variable**: body length only. Subject, hero, click destinations, CTAs all identical to wave 1.

**Audience**: same 8931 pool. Wave 1 done-tagged 4000 (verified live at audit time). Pool after done-tag filter = 4931. Hash-sort ASC + first-1000-per-arm selects positions 2000..2999 within each arm (mathematically disjoint from wave 1 by deterministic SHA256 + sort).

**Children to audit (all 8, same subject + Variant B parent)**:
- A1 short #1 `e7498429-efc9-4065-8018-5c830ac9749e` @ `2026-05-30T16:30:00Z`
- B1 long  #1 `93d7d2b6-b9f1-4932-bbbb-f61836db18c5` @ `2026-05-30T16:34:00Z`
- A2 short #2 `3da575cc-faea-4668-ac2c-80c95f296d71` @ `2026-05-30T16:38:00Z`
- B2 long  #2 `7cedf4ef-c7ab-45c1-8804-619eed34eaa8` @ `2026-05-30T16:42:00Z`
- A3 short #3 `52ee1ad3-e665-4c94-9bb9-16bcdc68d11e` @ `2026-05-30T16:46:00Z`
- B3 long  #3 `fedf2c6b-8909-46db-ba3b-a2cfa4217ac6` @ `2026-05-30T16:50:00Z`
- A4 short #4 `3281e10f-3298-4d2e-b64a-7fead1c3cd48` @ `2026-05-30T16:54:00Z`
- B4 long  #4 `b2bb5594-6a27-46e7-8aa8-ef5e69d9faa3` @ `2026-05-30T16:58:00Z`

Pattern: 8 chunks of 250, interleaved A/B, 240s `scheduledAt` stagger. Real wall-clock under global send-lock ~30-40 min total, all 8 expected to complete by ~17:10Z.

**Audit at**: `2026-05-30T16:00Z`, ~30 min before first fire. Re-audit of the same script that cleared wave 1; only two constants changed (SUBSAMPLE_PER_ARM, SCHEDULED_FIRST_FIRE). Auditor confirmed live: 4000 subs currently carry `done-belgium-trailer-2026-05-30` tag matching wave-1 ledger; getDoneTagged() will drop them at script start; remaining pool 4931 sub-sampled correctly to 1000/arm.

**Verdict**: `SAFE`. All sections PASS. Same carried caveats as wave 1: D (DB UNIQUE constraint not re-queried, app-level filter is primary guard) and STAGGER_SEC=240 vs per-child ~225s wall-clock so stagger is execution-order hint not interrupt window.

**Outcome**: TBD. Honest signals to watch at 24-48h on wave-1 + wave-2 combined (6000 sent total, 3000 per arm):

- **Per-arm Gmail-only OPEN rate**: more statistical power with 3000/arm. If Short still leads by 3-5pp, A/B winner is locked.
- **Per-arm CTR to /concert-trailer**: clicks are still small numbers (wave-1: short 7, long 5). Combined sample needed for confidence.
- **Per-arm UNSUB rate**: wave 1 tied at 0.35%. Watch whether Long unsubs creep up as the message reaches more inactive segments.
- **No regressions expected**: wave-1 fired clean (0 spam complaints, 0 bounces).

Wave 3 holds 2931 net-new recipients. Same script, same idempotency, fires when user gives the word.

Master log entry: 2000 more rows tagged `done-belgium-trailer-2026-05-30` post-fire. Total tagged after wave 2 = 6000.

---

## 2026-05-30 early morning, Belgium concert trailer A/B wave 1: 16x250 SHORT vs LONG (Send 41-56)

**Planned**: First wave of a body-length A/B test announcing the new Belgium concert trailer (youtu.be/N75lvM0-hn8). Same subject ("Experience the energy of an evolved piano concert"), same hero (YouTube trailer thumbnail), same destination LP (belgium.musicalbasics.com/concert-trailer), same final CTA. Only the body varies: Short (~290 words, 7.6KB) vs Long (~720 words, 19.3KB with event details, bio, viral-videos bullets, 3 testimonials, 2x ticket CTAs). User wants to fire 4000 wave 1 (2000 per arm) and reserve the remaining 4931 for a later wave once the Short vs Long signal lands.

**A/B variable**: body length only. Subject, hero, click destinations, CTAs all identical.
- Arm A (Short): `_work/belgium-trailer-short.html`
- Arm B (Long): `_work/belgium-trailer-long.html` (adds Event Details, sold-out venues bio, livestream callout, viral-videos block linking to 3 new LPs `/moonlight-sonata-nightmare` `/12-levels-of-beethoven` `/still-dre`, 3 testimonials, 2nd LAST TICKETS CTA)

**Audience**: 8931 unique canonical emails (after Wix BE/NL/LU/GB/DE add, xlsx unsub lists rejected as unreliable per `_work/analyze-xlsx-unsubs.py` analysis, only 14 of 5349 verifiably bad and already caught by Supabase status). Sub-sampled wave 1 = 4000 via SHA256(canonical(email)) deterministic split + hash-sort ASC selection of first 2000 per arm. Remainder (4931) carries forward for next wave; same hash function keeps re-runs disjoint via done-tag idempotency.

**Children to audit (all 16, same subject + Variant B parent)**:
- A1 short #1 `7cd42a91-4c8b-4e5c-8e2d-c4f3a51917e9` @ `2026-05-30T14:00:00Z`
- B1 long  #1 `17d8714a-e6c6-4869-b522-a58b2b7d5774` @ `2026-05-30T14:04:00Z`
- A2 short #2 `4d9f77ad-521a-41a1-9b8f-1c618fd22a97` @ `2026-05-30T14:08:00Z`
- B2 long  #2 `92b3d149-5980-42a5-812a-1f9ebc186da5` @ `2026-05-30T14:12:00Z`
- A3 short #3 `a6824a1f-16e5-41a1-9140-6b4aee94a04e` @ `2026-05-30T14:16:00Z`
- B3 long  #3 `e006340a-c0f0-4a1e-b8f2-0f3886f2571d` @ `2026-05-30T14:20:00Z`
- A4 short #4 `4feb9565-2266-420c-8bce-f22b85fa1b63` @ `2026-05-30T14:24:00Z`
- B4 long  #4 `ceb2d6ba-a7c4-4903-8112-3c201bee0624` @ `2026-05-30T14:28:00Z`
- A5 short #5 `81579094-01c7-42fc-ac42-2ceb5b75ce31` @ `2026-05-30T14:32:00Z`
- B5 long  #5 `336aa777-5e5c-4c08-a93b-50e3053114ef` @ `2026-05-30T14:36:00Z`
- A6 short #6 `9749bd98-5e65-42cc-9e77-a6f6a315087d` @ `2026-05-30T14:40:00Z`
- B6 long  #6 `9c7da8d3-b7a6-4cc0-b739-dfe767507d19` @ `2026-05-30T14:44:00Z`
- A7 short #7 `fb544e4f-07e2-4fd8-a2bf-9736b6c11003` @ `2026-05-30T14:48:00Z`
- B7 long  #7 `083e9f68-b034-4d18-b794-7dc553e3b0cd` @ `2026-05-30T14:52:00Z`
- A8 short #8 `4006d134-c4c6-4bfd-bed5-9ef6c9b794ae` @ `2026-05-30T14:56:00Z`
- B8 long  #8 `f1543ca9-68ec-4580-bff0-3afc85787c9a` @ `2026-05-30T15:00:00Z`

Pattern: 16 chunks of 250 recipients, interleaved A/B, 240s `scheduledAt` stagger. Real wall-clock under global send-lock will exceed the 1-hour scheduledAt spread; ~14 children x ~280s/child = ~70 min expected total fire window.

**Audit at**: first audit `2026-05-30T05:59Z` (verdict UNSAFE, 3 blockers); re-audit at `2026-05-30T06:08Z` (verdict SAFE) after fixes; scheduler ran `06:07Z` (killed mid-flight at 14/16) and re-ran cleanly `07:35Z`. All children scheduled by `07:38Z`, ~6h22m before first fire.

**Verdict**: `SAFE` (after fixes). First audit pass surfaced 3 blocking issues, all corrected:

  1. **Test Account leak across non-Supabase sources**: `is_eligible_external` checked Test Account only on the Supabase pull; Shopify/Omnisend/Wix rows skipped that check. Lionel's own email `lionel@musicalbasics.com` was sitting at line 79758 of `trailer-audience.json` (Shopify consent:none geo:usa) and would have fired in Arm A. Fix: added `HARD_EXCLUDE` set at `_work/build-trailer-audience.py:70-79` applied at merge across all sources, populated from a live `tags ?? Test Account` Supabase query, caught 8 addresses: lionel@musicalbasics.com, musicalbasics@gmail.com, support@musicalbasics.com, yu_lionel@yahoo.com, yulionel829@gmail.com, djsputty@gmail.com, dark_mist3000@yahoo.com, crazycommunistkid@gmail.com. Grep confirms 0 occurrences of each in final audience JSON.

  2. **Consent policy override bug**: `load_shopify()` was passing `status_hint="Subscribed"` to `is_eligible_external`, which flipped `is_subscribed=True` and bypassed the geo+consent gate. Net effect: 613 non-Belgium-geo consent:none Shopify customers (USA/CA/AU/etc.) were being silently admitted. Direct violation of CLAUDE.md "non-Belgium geo requires consent:marketing." Fix: removed the `status_hint="Subscribed"` override at `_work/build-trailer-audience.py:165` (now passes `""`). Audience dropped from 9471 -> 8931 after fix (Shopify-eligible: 4252 -> 3171; 537 net after dedup).

  3. **Vercel timeout headroom**: per-child max 300 recipients * ~0.9s = ~270s vs 300s maxDuration = ~10% headroom. Recommended drop to 250 for ~25% headroom. Applied at `_work/schedule-belgium-trailer-ab.ts:39`.

Re-audit verdict: `SAFE`. All sections PASS; D (DB UNIQUE constraint) carried as "verified in prior audits, not re-queried this session, app-level filter is primary guard"; non-blocking caveats noted: STAGGER_SEC=240 < per-child ~270s wall-clock so the stagger is execution-order hint only (not a meaningful interrupt window between children), and the 95% ensureSub success threshold could let up to 5% silently drop with no done-tag (coverage caveat, not retry safety).

**Recovery mid-flight**: After the FIRST scheduler run successfully scheduled 14 of 16 children (8 short + 6 long, IDs 48cd08b2 through 9a30e128), the user spotted a phishing-risk pattern: the visible body text `https://youtu.be/N75lvM0-hn8` was hyperlinked to `belgium.musicalbasics.com/concert-trailer`. Display URL ≠ destination URL is a classic phishing-filter signature. Recovery actions all completed before any send fired:
  - Killed scheduler PID 67355 (status 144)
  - Set `scheduled_status='cancelled'` and `status='cancelled'` on all 14 children via `_work/cancel-trailer-wave1.ts`. Inngest `agent-scheduled-send.ts:69-74` short-circuits cancelled/completed campaigns so they would not have fired even if dispatch happened.
  - Cleared `done-belgium-trailer-2026-05-30` tag from 3500 affected subs (had to run 4 passes due to PostgREST 1000-row cap; final count 0)
  - Rewrote both email bodies to drop the visible URL text entirely: "The energy of the evening is captured in my concert trailer, watch it below." Thumbnail click and CTA button both still route to `/concert-trailer` for tracking.
  - Re-sent self-tests, user approved, re-ran scheduler from clean state. 16 new children with IDs in this entry.

Additional rounds of in-flight copy edits before re-firing: "select group" -> "lucky group", livestream callout rewrite ("get livestream tickets here" instead of "watch the VIP Livestream"), closing line rewrite ("the unforgettable energy of a Lionel Yu piano concert" instead of "the evolved version of the piano concert"), trailer LP autoplay round-trip (added muted autoplay, then reverted to click-to-play facade for unmuted-on-click UX). Subject/preheader unchanged from initial drafts.

**Outcome**: TBD. First fire scheduled `14:00Z` (~10am EDT). Expected wall-clock 14:00Z -> ~15:10Z for all 16 to complete under global send-lock. Honest signals at 24-48h:

- **Per-arm OPEN rate (Gmail-only honest)**: direct effect of Short vs Long. Hypothesis: Short opens slightly higher (preview snippet shorter and stronger CTA-forward) but Long opens hold or beat if the trailer thumbnail + "lucky group" framing primes click intent.
- **Per-arm CTR to /concert-trailer**: the key A/B signal. Short relies on thumbnail + 1 button. Long adds: viral-videos bullet links to 3 separate LPs (additional click targets, may inflate raw click count). To compare arms cleanly, compare clicks to `/concert-trailer` specifically, not total link clicks.
- **Per-arm UNSUB rate**: Long has 2x ticket CTAs + 3 testimonials + bio paragraph -> stronger ask -> may push unsubs slightly higher. Watch.
- **Spam-flag risk**: visible URL mismatch was the primary risk; eliminated. Hero thumbnail still uses `img.youtube.com/vi/...` CDN URL but that's an `<img>` src, not visible link text, no phishing flag.
- **Trailer LP conversion signal**: `/concert-trailer` LP has in-person + livestream ticket CTAs both pointing to belgium.musicalbasics.com/, track UTM/click data on that bounce.
- **Anti-signal to watch**: if non-Belgium-geo Long opens drop significantly more than Belgium-geo Long opens, the 720-word "concert details" body is too venue-specific for the global audience (since 60%+ of the 4000 cannot attend in-person and only the livestream pitch applies). Would inform Wave 2 copy split.

Wave 2 holds 4931 net-new recipients with done-tag idempotency. Same script, no code changes needed, just re-run after wave 1 signal is in hand.

Master log entry: 4000 rows tagged `done-belgium-trailer-2026-05-30` post-fire.

---

## 2026-05-27 early morning, Campaign 2 wave 13: 4x250 FUR ELISE PREHEADER A/B retargeting (Send 37-40)

**Planned**: Pivot of the Fur Elise retargeting test variable. W11+W12 (750/750) showed the subject test directionality is locked: "boring" wins CTR by 1.5x, "2026" wins opens by +1.2pp, unsubs nearly tied. Continuing the subject A/B is low-learning. Pivoting to test PREHEADER text (untested variable in C2). Locked subject = winner on CTR: "They said 'Fur Elise' is boring, so I played this".

**A/B variable**: preheader text (the hidden inbox-preview text that Gmail shows after the subject).
- Arm A (control): `fur-elise-w11.html` as-is, no preheader. Gmail picks the first body sentence as preview.
- Arm B (with preheader): `fur-elise-w13-arm-b-preheader.html` adds a hidden `<div style="display:none">` at the top of `<body>` containing "Classical to dubstep in 3 minutes." plus `&nbsp;&zwnj;` pad characters to push past the default snippet (industry-standard Litmus/Mailchimp pattern).

**Children to audit (all 4 use the same locked subject)**:
- A1 no-preheader child `47e5ca82-0175-44f1-b614-37d850e9d7da` at `2026-05-27T07:40:00Z`
- B1 with-preheader child `08923eb5-ef0b-496f-81c9-f8bc103e05b0` at `2026-05-27T07:45:00Z`
- A2 no-preheader child `6ac9d748-8727-4b60-ad29-07d56928b406` at `2026-05-27T07:55:00Z`
- B2 with-preheader child `3f92aaaa-1fa8-4e47-92d7-02522f702d6d` at `2026-05-27T08:00:00Z`

Schedule pattern same as W12 (5/10/5-min staggered chunks). Each child 250 recipients, well under 300s maxDuration.

**Audience**: active + tagged `done-no-school-today` + NOT `done-fur-elise` + NOT Test/Bounced. Eligible pool 3,960 (down from 4,960 since W12 took 1,000). Picked 1,000 with seed `20260527051`, split 4 disjoint chunks of 250. After fire, all 1,000 tagged `done-fur-elise`.

**Audit at**: `2026-05-27T07:29Z`, ~11 min before A1 fire. Setup ran at `07:26Z`, schedule fired at `07:30Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: A1.html_content === A2.html_content (sha256 `daf08da2...` both 9,333 bytes, no preheader); B1.html_content === B2.html_content (sha256 `8723493e...` both 9,921 bytes, with preheader); A vs B differ by exactly the 588-byte preheader div; ALL 4 subjects identical with ASCII apostrophes (0x27); em-dash count 0 everywhere; zero `youtu.be/` hrefs; "Classical to dubstep in 3 minutes." present in B1+B2 only; cross-chunk disjointness verified (6 pair intersections = 0); zero overlap with the 1,496 `done-fur-elise`-tagged cohort. Throttle headroom 75%. Auditor explicitly noted the `&nbsp;&zwnj;` padding pattern is industry-standard and low spam-filter risk; caveat to watch for is if Arm B opens come in materially lower than Arm A (would signal pad-char penalty).

**Outcome**: TBD. All 4 fire over 20-min window starting 07:40Z (~03:40 AM ET Wednesday). Honest signals at 24-48h:
- Per-arm OPEN rate. Direct preheader effect since body, subject, audience are otherwise identical. Hypothesis: preheader adds a second inbox-preview hook and lifts opens.
- Per-arm CTR. Should be similar (body+landing unchanged) unless preheader pre-qualifies a different reader.
- Per-arm UNSUB rate. Should be similar across arms.
- Anti-signal to watch: if Arm B opens drop significantly, the pad-char technique is being penalized (revisit before W14).

Master log appended with 1,000 more rows.

---

## 2026-05-26 afternoon, Campaign 2 wave 12: 4x250 FUR ELISE RETARGETING done-NST cohort (Send 33-36)

**Planned**: First retargeting wave. Re-hits subscribers who got any C2 email (W1-W10) with the Fur Elise variant they haven't seen yet. First C2 wave to split into 4 chunks of 250 instead of 2 chunks of 250, both for spam-filter safety and to stay well under Vercel maxDuration per child.

**Setup**:
- Retroactively tagged W11's 500 recipients with `done-fur-elise` BEFORE setup (so they don't re-target themselves). Done via `_work/tag-w11-fur-elise.ts`.
- Audience filter: `active` + tagged `done-no-school-today` + NOT `done-fur-elise` + NOT `Test Account` + NOT `Bounced`. Eligible pool 4,960.
- Picked 1,000 with seed `20260526194`, split into 4 disjoint chunks of 250 (cross-chunk overlap verified zero pairwise).

**Schedule** (interleaved, gaps spread Resend load + give concurrency lock breathing room):
- A1 child `507808a2-9ebb-48a0-a0c4-919395380bc6` at `2026-05-26T20:10:00Z` — subject "They said 'Fur Elise' is boring, so I played this"
- B1 child `ec6de553-4ce0-4c2b-99f8-6576ce790d0f` at `2026-05-26T20:15:00Z` — subject "If Beethoven Wrote Fur Elise In 2026..."
- A2 child `1e1db20e-7cd2-458b-840f-89c23387786f` at `2026-05-26T20:25:00Z` — same as A1 subject
- B2 child `18007f0d-fad3-4d60-ab2c-2067dc9890c2` at `2026-05-26T20:30:00Z` — same as B1 subject

Each child = 250 recipients = ~225s wall-clock. 5-min and 10-min staggers are sufficient for the global concurrency lock to serialize them (locks have ~75s headroom on the 5-min gaps, which is fine).

**Audit at**: `2026-05-26T19:49Z`, ~21 min before A1 fire. Setup ran at `19:47Z`, schedule fired at `19:51Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: all 4 children have BYTE-IDENTICAL html_content (sha256 `daf08da20cf4c7631042736abbd88cfc23106b9415fe8e99eb34a424f786ee9c`, 9,333 bytes) matching `_work/fur-elise-w11.html`; A1+A2 carry identical subject (ASCII apostrophes, no curly), B1+B2 carry identical subject (three ASCII dots, no Unicode ellipsis); A* differs from B*; zero em dashes anywhere; zero `youtu.be/` hrefs; cross-chunk disjointness verified pairwise (all 6 pair intersections = 0, union = 1,000); zero overlap with the 500-strong `done-fur-elise` cohort (proving the W11 retroactive tagging worked + the filter is correct); D. DB UNIQUE constraint verified live (code 23505 on duplicate insert probe).

Auditor caveat (cosmetic, not blocking): 5-min gaps have ~75s headroom over expected child wall-clock. If Resend latency spikes, next-in-line child may sit queued in Inngest behind the lock briefly; safe but means actual fire times may drift slightly past nominal slots.

After successful schedule, all 1,000 recipients were bulk-tagged `done-fur-elise` (2 batches of 500 each via API). This is the idempotency tag for the Fur Elise retargeting series — future Fur Elise waves filter by NOT done-fur-elise.

**Outcome**: TBD. Both arms fire over 20-minute window starting 20:10Z (~04:10 PM ET Tuesday). Honest signals at 24-48h (1000 total recipients = 500 per subject, biggest single A/B sample in the campaign):
- Per-subject open rate. Will firm up W11's directional finding (B "2026" leads opens at 11h).
- Per-subject CTR. Will firm up W11's directional finding (A "boring" leads CTR ~2× at 11h).
- Per-subject unsub rate, especially among the retargeted cohort who have already seen NST or Rach Prelude. Higher cumulative unsub risk than W11 because these recipients are on their 2nd+ C2 email.
- Concurrency lock behavior: first 4-chunk schedule, watching whether all 4 complete cleanly within their nominal slots.

Master log appended with 1,000 more rows.

---

## 2026-05-26 early morning, Campaign 2 wave 11: 250/250 FUR ELISE subject A/B (Send 31 + Send 32)

**Planned**: Brand new email variant - Fur Elise "three ways" (1 min classical / 1 min heroic / 1 min dubstep nightmare). Both arms use the same new body (`_work/fur-elise-w11.html`) and link to the new `/fur-elise` landing page (deployed today on belgium-concert-landing-page, commit `b090448`). SUBJECT-only A/B:
- Arm A child `fbcaebbb-a81e-4eec-a577-4b4db0f9afac` at `2026-05-26T08:30:00Z`, subject "They said 'Fur Elise' is boring, so I played this" (confrontational/curiosity hook)
- Arm B child `f99005d5-314b-4d8b-b254-adbe0c1012ea` at `2026-05-26T08:35:00Z`, subject "If Beethoven Wrote Fur Elise In 2026..." (modern reimagining angle)

This is the third entirely-new email variant in C2 (after NST in W1-W6 and Rach Prelude in W7-W10). Body framing: invite the reader to forward to anyone they know who thinks classical music is boring. Concert tie-in mentions Fur Elise Nightmare in the program alongside the other Nightmare arrangements + No School Today + Rach Prelude.

**Audience**: Mixed (same shape as W8-W10). Active subscribers, NOT Test/Bounced/done-no-school-today. No followup-b filter, no C1 final exclusion (now 5 days post-C1). Eligible pool 638 (33 Gmail / 605 non-Gmail) - this is essentially the last viable 250/250 wave for the campaign without re-targeting. Picked 500 with seed `20260526075`, split 250/250 disjoint. Arm A 9 Gmail / 241 non-Gmail. Arm B 17 Gmail / 233 non-Gmail.

**Audit at**: `2026-05-26T08:06Z`, ~24 min before Arm A fire. Setup ran at `08:03Z`, schedule fired at `08:07Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: html_content byte-identical between arms (sha256 daf08da2..., 9,333 bytes each); subjects DIFFER and the special characters are ASCII (apostrophes 0x27 not curly 0x2018/0x2019; "..." is three ASCII dots not Unicode U+2026 ellipsis); em-dash count 0 on html and both subjects; ZERO `youtu.be/` clickable hrefs (1 `img.youtube.com` thumbnail for `40ruweRl54k` is the non-clickable image src as expected); 5 hrefs per child (3 `/fur-elise` + 1 `/` + 1 `{{unsubscribe_url}}`); 0 overlap with done-NST cohort (~4,969 tagged); 0 cross-arm overlap.

**Outcome**: TBD. Both arms fire at 08:30Z / 08:35Z (~04:30 AM / 04:35 AM ET Tuesday). Honest signals at 24-48h:
- Per-arm OPEN rate. Direct subject comparison since body + landing identical. Hypothesis: "boring + curiosity" subject pulls more opens than "2026 reimagining"; counter-hypothesis: the ellipsis curiosity gap may match. Also a cross-wave comparison against Rach (W7-W10) and NST (W1-W6) at the body level.
- Per-arm CLICK rate. With same body + landing both arms should have similar CTR, BUT the "boring" subject may attract a more skeptical opener less likely to click through.
- Per-arm UNSUB rate. The confrontational tone of Arm A subject may push unsubs higher than the more neutral Arm B.

Also fired test sends (children `ffd0c6de-9bd1-457e-8cc3-0db9afc33cd6` for Arm A, `53f3417d-a656-4b98-8279-e3303d993ef7` for Arm B) so user could preview both subjects pre-fire.

Master log appended with 500 more rows.

---

## 2026-05-25 afternoon, Campaign 2 wave 10: 250/250 W9 continuation Rach SUBJECT A/B (Send 29 + Send 30)

**Planned**: Continuation of W9 Rach subject A/B. Same Rach gateway-beer body, same `/prelude` link, same two subjects. Goal: pool W9+W10 for a 500/500 read on subject choice. Arm A child `4eeec28c-a2de-4ede-bb7a-52503a1d7b58` at `2026-05-25T18:25:00Z` carries the current "favorite at parties" subject. Arm B child `4b5f9567-9940-4927-8c30-98207dbaaf33` at `2026-05-25T18:30:00Z` carries the bolder "Rachmaninoff's Biggest Banger" subject. Both arms 250 mixed-audience recipients.

**Audience**: Mixed (same shape as W8+W9). Active subscribers, NOT Test/Bounced/done-no-school-today. Eligible pool 1,138 (58 Gmail / 1,080 non-Gmail) post-W9. Picked 500 with seed `20260525181` (distinct from W9's `20260525061`), split 250/250 disjoint. Arm A 12 Gmail / 238 non-Gmail, Arm B 13 Gmail / 237 non-Gmail.

**No test sends**: HTML + subjects identical to W9, user already previewed there.

**Audit at**: `2026-05-25T18:11Z`, ~14 min before Arm A fire. Setup ran at `18:10Z`, schedule fired at `18:13Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: html_content byte-identical between A and B (both 9,249 chars), subjects differ as expected, em-dash count 0 on both fields, ZERO `youtu.be/` hrefs (3 `/prelude` hrefs on each), 0 overlap with done-NST cohort (now ~4,469 tagged), 0 cross-arm overlap, 0 overlap with W9 children (which are both completed/sent with full 250 rows each). Throttle headroom ~75%.

**Outcome**: TBD. Both arms fire at 18:25Z / 18:30Z (~02:25 PM / 02:30 PM ET Monday, second midday-ET send of the campaign). After W10 matures, pooled W9+W10 will give 500/500 on the subject A/B with Rach body held constant.

Master log appended with 500 more rows.

---

## 2026-05-25 midday, Campaign 2 wave 9: 250/250 Rach-only SUBJECT A/B, mixed audience (Send 27 + Send 28)

**Planned**: Rach-only wave. Both arms use the IDENTICAL Rach Prelude body (gateway-beer narrative) and link to the `/prelude` landing page. ONLY the subject differs:
- Arm A child `c92865e2-f81d-4d85-8a55-27a9fe640c02` at `2026-05-25T16:30:00Z` carries the current subject "My favorite piece to play at parties (Prelude in G Minor op 23 no 5)" (the one used in W7/W8 Arm B).
- Arm B child `93b42634-824d-4676-9991-595485d8cf9f` at `2026-05-25T16:35:00Z` carries the new bolder subject "Rachmaninoff's Biggest Banger (Prelude in G Minor)".

Goal: isolate whether the bolder "Biggest Banger" framing pulls more opens than the personal-anecdote "favorite at parties" framing, given identical body and landing page. The user originally brainstormed both as candidates back at the start of the Rach test.

**Audience**: mixed (Gmail filter still dropped, same shape as W8). Active subscribers, NOT Test/Bounced/done-no-school-today. Eligible pool 1,638 (78 Gmail + 1,560 non-Gmail). 500 picked with seed `20260525061`, split 250/250 disjoint.
- Arm A: 6 Gmail / 244 non-Gmail
- Arm B: 14 Gmail / 236 non-Gmail
- Same caveats as W8: Apple MPP inflates non-Gmail opens, corporate URL scanners can inflate non-Gmail clicks. Per-arm RELATIVE numbers within W9 still meaningful since both arms share noise floor.

**Audit at**: `2026-05-25T16:14Z`, ~16 min before Arm A fire. Setup ran at `16:12Z`, schedule fired at `16:15Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: html_content is BYTE-IDENTICAL between arms (sha256 9135cd44... on both, 9,249 bytes each, matches source file exactly); subjects differ as expected; em-dash count 0 on both html_content and both subjects (Arm B uses plain ASCII apostrophe in "Rachmaninoff's"); both children carry 3 `/prelude` + 1 `/` hrefs, ZERO `youtu.be/`; 0 overlap with done-NST cohort (now ~4,000 tagged); 0 cross-arm overlap; subscriber_ids arrays length 250 each. Throttle headroom ~75%. D. DB UNIQUE constraint UNKNOWN this run, application-layer idempotency check at route.ts:225-260 is the primary guard.

**Outcome**: TBD. Both arms fire at 16:30Z / 16:35Z (~12:30 PM / 12:35 PM ET Monday — first midday-ET send of the campaign, vs the overnight pattern of W1-W8). Honest signals at 24-48h:
- Per-arm OPEN rate. Same body + landing page + audience composition between arms, so any open delta is purely subject-attributable. The clean test we couldn't do before because earlier waves changed multiple variables at once.
- Per-arm CLICK rate. Should be roughly the same if the subjects pull comparable open volume and the body+landing-page do the click work. Big asymmetry would suggest the subject also affects post-open intent.
- Per-arm UNSUB rate. Watching whether "Biggest Banger" framing pushes unsubs up vs the more reserved "favorite at parties."

Also fired test sends: children `c49e8b0b-3280-47bc-a476-81fbc21a1764` (Arm A test) and `0858bc4a-35a7-470a-9d20-89a784164872` (Arm B test), 8 Test Accounts each, so user could preview both subjects in inbox before production fire.

Master log appended with 500 more rows.

---

## 2026-05-25 early morning, Campaign 2 wave 8: 250/250 W7 continuation, MIXED audience (Send 25 + Send 26)

**Planned**: Continuation of W7's NST control vs Rach Prelude two-variant test. Same HTML files, same subjects, same landing-page links. Arm A child `c6621780-9bd6-4b96-abab-7a3e0c5b269d` at `2026-05-25T05:30:00Z`. Arm B child `4c80c890-9785-46a0-a676-462328a35121` at `2026-05-25T05:35:00Z`. Goal: pool W7 + W8 for a 500/500 read on the two-variant comparison, with the caveat that W8 is mostly non-Gmail.

**Audience change (intentional trade-off)**: Gmail-only pool is exhausted (~103 eligible Gmail after W7). User accepted dirtier signal for bigger sample. Dropped Gmail filter. Resulting mix:
- Arm A: 15 Gmail / 235 non-Gmail
- Arm B: 11 Gmail / 239 non-Gmail
- Total: 26 Gmail / 474 non-Gmail across both arms

Per project memory: Apple MPP inflates opens for Apple recipients, corporate URL scanners can inflate clicks for non-Gmail. So W8 opens and clicks should NOT be directly compared to W1-W7 numbers. The W7-vs-W8 same-arm comparison will quantify the inflation, which is useful in itself.

**Audience filter**: active subscribers (ALL domains), NOT Test Account, NOT Bounced, NOT tagged done-no-school-today. C1 final exclusion still dropped (now 5 days post-fire). Eligible pool 2,138 (104 Gmail + 2,034 non-Gmail). 500 picked with seed `20260525051`, split 250/250 disjoint.

**No test sends** this wave: HTML and subjects identical to W7.

**Audit at**: `2026-05-25T05:22Z`, ~8 min before Arm A fire. Setup ran at `05:19Z`, schedule fired at `05:23Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: zero `youtu.be/` hrefs in either child; subjects differ as expected; html_content differs substantially (A=8,902 bytes / B=9,249 bytes); em-dash count 0 on both html_content and both subjects; 0 overlap with done-NST cohort (~3,500 tagged); 0 cross-arm overlap; Gmail mix matches expectation (A=6.0%, B=4.4%); W7 children both completed at 03:07Z so no concurrency lock contention; throttle headroom ~75% (225s of 300s maxDuration). D. DB UNIQUE constraint UNKNOWN this run (no exec_sql RPC available) but application-layer idempotency check at route.ts:219-260 is the primary guard.

**Outcome**: TBD. Both arms fire at 05:30Z / 05:35Z (~01:30 AM / 01:35 AM ET Monday). Honest signals at 24-48h:
- Per-variant open rate, with mandatory caveat that ~95% of recipients are non-Gmail and many are Apple (MPP-prefetched opens look artificially high)
- Per-variant click rate, also caveat for corporate URL scanners on enterprise domains
- **Most useful cross-wave comparison**: same-arm W7 (Gmail) vs W8 (mostly non-Gmail) opens/clicks deltas, to quantify what non-Gmail noise actually looks like in this audience
- Per-variant unsub rate (this metric is provider-agnostic and clean)

Master log appended with 500 more rows.

---

## 2026-05-25 late evening, Campaign 2 wave 7: 250/250 TWO-VARIANT test (NST control vs Rach Prelude) (Send 23 + Send 24)

**Planned**: First C2 wave to test two ENTIRELY DIFFERENT emails head-to-head (different subject + body + landing page). Arm A child `7bb3efd8-2340-4e5f-b8c4-7482264443a0` at `2026-05-25T03:00:00Z` is the W5/W6 Arm A NST control (subject "My first new piece in 8 months", long-narrative body, links to `/no-school-today`). Arm B child `58b8f58f-afc5-40c0-8ad8-9f47598049ad` at `2026-05-25T03:05:00Z` is brand new: subject "My favorite piece to play at parties (Prelude in G Minor op 23 no 5)", new "gateway beer of classical music" body about Rachmaninoff Prelude in G Minor, links to the new `/prelude` landing page (deployed today on belgium-concert-landing-page commit `06b2441`, sibling to `/no-school-today`). Both arms mention Belgium concert + the other piece for cross-context.

**Why this design**: W5+W6 showed the click-opt body LOST to control body ~4× on clicks, so dropping click-opt for good. Trying a much different angle: pivot to the Rach Prelude as the "hook piece" while still mentioning No School Today. Headline question: does the recognizable-virtuoso angle pull better engagement (opens + clicks + concert CTA bumps) than the personal-narrative angle that's been our baseline?

**Audience changes for W7** (notable):
- Dropped `done-belgium-followup-b` filter (no-op anyway: 5,616 of 5,624 active subs have it, only Test Accounts don't).
- Dropped C1 final 480 exclusion. C1 fired 2026-05-21 = 4 days ago, past the same-week-cadence concern. Without this drop only 129 eligible; with it, 604 eligible.
- ~391 of the 500 picked are in C1 final (got an email 4 days ago, will get this one). Intentional this wave.
- Otherwise standard: active Gmail, not Test/Bounced/done-no-school-today.

**Audit at**: `2026-05-25T02:35Z`, ~25 min before Arm A fire. Setup ran at `02:34Z` (first attempt hit the 129-eligibility floor and threw; updated to drop C1 final exclusion and re-ran at `02:34Z` successfully). Schedule fired at `02:38Z`.

**Verdict**: `SAFE`. All sections PASS. Auditor verified live: zero `youtu.be/` hrefs in either child; Arm B uses the new `img.youtube.com/vi/Bjouy1XpO9M/maxresdefault.jpg` thumbnail (Rach video) while Arm A still uses `y3SZI2AM0Uc` (NST video); subjects DIFFER between A and B; html_content differs substantially (A=8,902 bytes, B=9,249 bytes); em-dash count 0 on both html_content and both subjects; 0 overlap with done-NST cohort (~3,000); 0 cross-arm overlap; ~391 C1 final overlap explicitly acknowledged as intentional. Throttle headroom ~75% (225s of 300s). D. DB UNIQUE constraint verified live (code 23505).

**Outcome**: TBD. Both arms fire at 03:00Z / 03:05Z (~11:00 PM / 11:05 PM ET Sunday). Headline metrics at 24-48h:
- Per-variant Gmail open rate. Different subjects, so opens are the primary subject test.
- Per-variant unique Gmail CLICK rate (both arms route through tracked landing pages). Different bodies + different landing pages, so clicks are the primary body+page test.
- Per-variant unsubscribe rate. Watching whether the bolder Rach framing pushes unsubs up.

Also fired test sends (children `31b6a0fa-9d3c-4301-91c7-63607bf74e11` and `4a39d30e-e087-47f8-82c1-023df5a6b3f1`, 8 Test Accounts each) so user could preview both variants pre-fire.

Master log appended with 500 more rows.

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
