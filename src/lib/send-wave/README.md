# send-wave

One function — `runWaveSend` — that does what every `_work/schedule-*.ts`
script has been doing by hand: load HTML + audience, validate, ensure
subscribers, chunk, interleave, schedule with stagger, bulk-tag for
idempotency.

## Why

Every prior scheduler script was ~250 lines of mostly-identical boilerplate.
That boilerplate contains the safety logic the `send-safety-auditor` subagent
checks: em-dash guard, `scheduledAt` freshness, invalid-email regex filter,
done-tag idempotency, ensureSub failure threshold, em-dash re-check post
patch, `clickTrackingMode = "append"`. Every script re-typed these. The
re-typing is where bugs slipped in (missing regex filter caused the 2026-05-31
W3 chunk-10 crash; `body.city` silently dropped by Zod for months before the
2026-06-03 auditor caught it).

With `runWaveSend`, the safety logic lives in one audited place. A new
scheduler is ~30 lines.

## Minimal usage

```ts
import { readFileSync } from "fs";
import { resolve } from "path";
import { runWaveSend, loadDotEnv } from "@/src/lib/send-wave";

loadDotEnv(resolve(__dirname, "../.env.local"));

const html = (f: string) => readFileSync(resolve(__dirname, f), "utf8");
const audience = (f: string) => JSON.parse(readFileSync(resolve(__dirname, f), "utf8"));

await runWaveSend({
  workspace: "musicalbasics",
  parentCampaignId: "db10a687-4233-4313-8431-8d2fa64a15c4",
  sourceCampaignId: "f2b25235-902b-4e74-8d52-eaea4917059b",
  arms: [
    { key: "L", subject: "Brussels in 9 days. Only ~60 tickets left.",
      html: html("variant-l-final.html"), audience: audience("audience-variant-l.json") },
    { key: "M", subject: "You're close enough to be there. Belgium, June 11.",
      html: html("variant-m-final.html"), audience: audience("audience-variant-m.json") },
    { key: "N", subject: "For one night, I'm playing live in Zaventem.",
      html: html("variant-n-final.html"), audience: audience("audience-variant-n.json") },
  ],
  scheduledFirstFire: "2026-06-03T06:00:00.000Z",
  doneTag: "done-belgium-logistics-2026-06-02",
  prospectTags: (armKey) => [`belgium-logistics-lmn-2026-06-03:${armKey.toLowerCase()}`],
  fromName: "Lionel Yu",
  fromEmail: "lionel@musicalbasics.com",
});
```

That replaces 280 lines of bespoke scheduler with 25.

## What it does, in order

1. Em-dash + placeholder check on every arm's HTML and subject.
2. `scheduledFirstFire` is >= now + 60s.
3. Per-arm invalid-email regex filter (drops bad locals like `foo#@gmail.com`).
4. Done-tag idempotency: drop anyone already carrying `doneTag`.
5. Source-campaign variable copy (default: `logo_src`).
6. Parallel `ensureSub` pool (default concurrency 8). Aborts at < 95% success.
7. Chunk each arm to `chunkSize` (default 250, ~25% Vercel headroom on a
   300s `maxDuration` route).
8. Interleave waves across arms (L1, M1, N1, L2, M2, N2, ...).
9. Per wave: clone parent, patch html/subject/vars, round-trip verify, POST
   `/send` with `scheduledAt`, then bulk-tag `doneTag` on those recipients.
10. Returns the scheduled-children list and prints the summary.

## Options reference

See `types.ts` (`RunWaveSendOptions`). Defaults:

| field | default | why |
|---|---|---|
| `chunkSize` | 250 | 250 × ~0.9s ≈ 225s vs 300s Vercel maxDuration |
| `staggerSec` | 240 | enough headroom for a 250-chunk to finish before the next fires |
| `ensureConcurrency` | 8 | bounded so the agent API doesn't get hammered |
| `clickTrackingMode` | `"append"` | redirect-mode triggered Gmail bulk-flagging on 2026-05-03 |
| `copyVariableKeys` | `["logo_src"]` | matches every prior scheduler |

## Dry-run mode

Pass `dryRun: true` to walk the plan without writing anything. Steps 1-5 +
chunking + interleaving still run and log per-wave timing. Useful when
tweaking `scheduledFirstFire`, `chunkSize`, `staggerSec` and you want to see
the resulting schedule first.

## When to NOT use this

- Recovery / resume scripts that re-fire specific failed chunks: those need
  per-chunk control the SDK doesn't expose. Keep them ad-hoc.
- Sends with arm-splitting done in TS (hash bucketing inside the script
  rather than pre-split audience JSON). Pre-split the audience in Python
  (`_work/split-*-audience.py` pattern) and pass each arm separately, or
  call `chunkArm` / `interleaveWaves` directly.
- Anything the audit log hasn't covered yet — write the one-off script,
  fire it, then decide if the new pattern is worth folding into the SDK.

## See also

- `.claude/agents/send-safety-auditor.md` — the auditor subagent. The SDK
  enforces what the auditor checks; if you change either, change both.
- `_work/schedule-belgium-logistics-lmn.ts` — the last hand-written
  scheduler; this SDK is its distilled form.
