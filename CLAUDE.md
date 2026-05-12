# dreamplay-email-3 — project instructions for Claude

## Quick orientation

This repo is the agent-driven campaign sender for MusicalBasics email. The pipeline is:

```
scheduler script (_work/schedule-*.ts)
  -> POST /api/agent/{workspace}/campaigns/{id}/send       (src/agent/handler.ts)
  -> Inngest event agent.campaign.scheduled-send
  -> Inngest function in src/inngest/functions/agent-*.ts
  -> fetch /api/send-stream (app/api/send-stream/route.ts)
  -> Resend API + sent_history INSERT per recipient
```

Tracking (opens, clicks, unsubscribes) is in a separate repo, **dreamplay-email-2**, hosted at `email.dreamplaypianos.com`. Send bugs are almost always in this repo. Tracking bugs are almost always in dp-email-2.

Production is Vercel, deployed on push to `main`. Every push to `main` is a production deploy — that's intended.

The Supabase project for email is `quyqwdjygzalqqmrgkfk`. There is a separate concerts project (`szlagsmxgfsobizzxaog`) — do NOT use it for email work; it has different tables and different env keys.

## MANDATORY: pre-send safety audit

Before doing any of the following, you MUST spawn the `send-safety-auditor` subagent (located at [.claude/agents/send-safety-auditor.md](.claude/agents/send-safety-auditor.md)) and obtain a SAFE verdict from its report:

1. Scheduling a bulk send of >= 50 recipients (i.e., running any `_work/schedule-*.ts` that targets a real audience).
2. Calling the agent API `/api/agent/{workspace}/campaigns/{id}/send` for a real workspace with a non-empty audience.
3. Merging changes that touch [app/api/send-stream/route.ts](app/api/send-stream/route.ts), [app/api/send-rotation/route.ts](app/api/send-rotation/route.ts), or any file under [src/inngest/functions/](src/inngest/functions/).
4. Applying a database migration that affects `sent_history`, `campaigns`, or `subscribers`.

The auditor is read-only. It produces a punch list. If the verdict is UNSAFE, surface the findings to the user verbatim and ask whether to proceed or fix the issues first. If NEEDS_REVIEW, treat as UNSAFE by default.

This rule exists because of the 2026-05-12 Gmail double-send incident ([docs/INCIDENT-2026-05-12-gmail-double-send.md](docs/INCIDENT-2026-05-12-gmail-double-send.md)). Every fact needed to predict the bug was visible in the code. The connection wasn't made. The auditor exists to make that connection mechanically, every time, so the same class of mistake cannot recur.

## Standing rules

### Time

Always run `date -u` before scheduling a send or computing a scheduled-at value. System reminders have been wrong multiple times. The user lives in ET; convert UTC <-> ET explicitly.

### Send cadence

- Resend rate limit on this account: **5 req/s** (verified from a 429 error on 2026-05-09). Default Pro tier is 10/s — this account is throttled.
- Per-recipient throttle in send-stream is currently 200ms (= 5/s). Do not lower without confirming the account limit has been raised.
- Never schedule two send children with the same `scheduledAt`. The Inngest concurrency lock now serializes them at the function layer, but the right pattern is still sequential `scheduledAt` values with enough gap (60s+ for 100-recipient children, 90s+ for 500-recipient children) so the user can interrupt between fires.

### Click tracking

- Default to `clickTrackingMode: "append"`. The `redirect` mode triggers Gmail bulk-flagging on cadenced sends (observed 2026-05-03 overnight, slots 6-10 collapsed Gmail open rates from ~42% to <2%).
- The send-stream code emits a warning when `redirect` is requested for a multi-recipient send. Honor it.

### Audience filtering

- Always exclude `tags.includes("Test Account")` from real sends.
- Always honor the campaign's idempotency tag (e.g., `done-belgium-followup-b`). The done-tag pattern is the audience-side complement to `sent_history` — it keeps subscribers from being re-targeted across separate scheduler runs.
- For follow-up sends, the audience query should always be "active subscribers, not done-tagged, not test-tagged."

### Destructive operations

Per global instructions, pause and confirm before:
- `git reset --hard`, force-push, branch deletion
- DB row deletions beyond a single record
- Truncating or dropping tables
- Disabling pre-commit hooks (`--no-verify`)

The send-safety auditor must be re-run after any code change to the send pipeline, even small ones.

## Repo conventions

- `_work/` is gitignored and contains scheduler scripts, ad-hoc diagnostic scripts, and audience snapshots. PII lives there; don't commit it.
- `docs/migrations/*.sql` are applied manually via the Supabase SQL editor. A file in this folder is NOT proof it's been applied — verify by querying `pg_constraint` / `pg_indexes` or by attempting an operation the migration enables.
- Commit messages follow `type(scope): subject` (`feat:`, `fix:`, `docs:`, `tweak:`, `chore:`) matching prior commits.
- Branches that touch the send pipeline should land via merge commit (`--no-ff`) so the related commits stay grouped in the history.

## Key references

- Incident write-up: [docs/INCIDENT-2026-05-12-gmail-double-send.md](docs/INCIDENT-2026-05-12-gmail-double-send.md)
- Overnight reconciliation context: [docs/BRANCH-NOTES-overnight-reconciliation.md](docs/BRANCH-NOTES-overnight-reconciliation.md)
- Most recent session handoff: [docs/SESSION-HANDOFF-2026-05-12.md](docs/SESSION-HANDOFF-2026-05-12.md)
- Agent API surface: [docs/EMAIL-AGENTS-API.md](docs/EMAIL-AGENTS-API.md)
- Workflows: [docs/WORKFLOWS.md](docs/WORKFLOWS.md)
- Open migrations awaiting apply: [docs/migrations/](docs/migrations/)

## Constants

- Email Supabase project: `quyqwdjygzalqqmrgkfk`
- Concerts Supabase project: `szlagsmxgfsobizzxaog` (DO NOT use for email tracking)
- Variant A parent template: `b04a217d-7855-447e-9b29-fa25b50802a0`
- Variant B parent template: `db10a687-4233-4313-8431-8d2fa64a15c4`
- Resend rate limit: 5 req/s
- Vercel maxDuration on send-stream: 300s
- Idempotency tag for Variant B: `done-belgium-followup-b`
- Idempotency tag for Variant A: `done-belgium-masterclass`
