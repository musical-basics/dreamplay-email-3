import type { RunWaveSendOptions, ScheduledChild, Candidate, ArmDef } from "./types";
import { createAgentClient } from "./api-client";
import {
  assertNoEmDash,
  assertScheduledFresh,
  assertNoPlaceholders,
  isValidEmail,
} from "./guards";
import { ensureAllSubscribers } from "./ensure-pool";
import { chunkArm, interleaveWaves } from "./chunker";
import { getDoneTagged, applyDoneTagBatch } from "./idempotency";
import { scheduleWave } from "./scheduler";

const DEFAULT_CHUNK_SIZE = 250;
const DEFAULT_STAGGER_SEC = 240;
const DEFAULT_ENSURE_CONCURRENCY = 8;
const DEFAULT_COPY_VARIABLE_KEYS = ["logo_src"];

/**
 * One-shot orchestrator for a multi-arm staggered send.
 *
 * Steps, with the guard that fires at each:
 *   1. Per-arm HTML + subject em-dash + placeholder check.
 *   2. scheduledFirstFire freshness check (>= now + 60s).
 *   3. Invalid-email regex filter (per-arm).
 *   4. Done-tag idempotency filter (drops anyone already done-tagged).
 *   5. Source-campaign variable copy (logo_src etc.).
 *   6. Parallel ensureSub pool. Abort if < 95% succeed.
 *   7. Chunk per arm, interleave across arms.
 *   8. Per wave: clone parent, patch html/subject/vars, verify, POST /send,
 *      bulk-tag DONE_TAG on those emails post-fire.
 *   9. Log final summary.
 *
 * On dryRun=true, steps 1-4 + chunking/interleaving still run and log the
 * plan, but no DB writes, clones, sends, or bulk-tags happen.
 *
 * Returns the list of scheduled children. On any failure inside step 8, the
 * function throws — children scheduled before the failure remain queued; the
 * caller should re-run after fixing the issue (re-runs skip already-tagged
 * recipients via step 4).
 */
export async function runWaveSend(opts: RunWaveSendOptions): Promise<ScheduledChild[]> {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const staggerSec = opts.staggerSec ?? DEFAULT_STAGGER_SEC;
  const ensureConcurrency = opts.ensureConcurrency ?? DEFAULT_ENSURE_CONCURRENCY;
  const clickTrackingMode = opts.clickTrackingMode ?? "append";
  const copyKeys = opts.copyVariableKeys ?? DEFAULT_COPY_VARIABLE_KEYS;
  const campaignNamePrefix = opts.doneTag.replace(/^done-/, "");

  if (clickTrackingMode === "redirect") {
    console.warn(
      `WARN: clickTrackingMode=redirect was flagged as the cause of the 2026-05-03 ` +
        `Gmail bulk-flagging incident. Reconsider before firing.`,
    );
  }

  console.log(`Now:               ${new Date().toISOString()}`);
  console.log(`First scheduledAt: ${opts.scheduledFirstFire}`);
  console.log(`DONE_TAG:          ${opts.doneTag}`);
  console.log(`Chunk size:        ${chunkSize}`);
  console.log(`Stagger:           ${staggerSec}s`);
  console.log(`Workspace:         ${opts.workspace}`);
  console.log(`Arms:              ${opts.arms.map((a) => a.key).join(", ")}`);
  for (const a of opts.arms) {
    console.log(
      `  [${a.key}] subject="${a.subject}"  html=${a.html.length}b  audience=${a.audience.length}`,
    );
  }
  if (opts.dryRun) console.log(`MODE: dry-run (no clone / send / bulk-tag)`);

  // Step 1: HTML + subject guards.
  for (const a of opts.arms) {
    assertNoEmDash(a.html, `${a.key} HTML`);
    assertNoEmDash(a.subject, `${a.key} subject`);
    assertNoPlaceholders(a.html, `${a.key} HTML`);
  }

  // Step 2: scheduledFirstFire freshness.
  assertScheduledFresh(opts.scheduledFirstFire);

  // Build per-arm working copies of the candidate lists so we don't mutate the caller's.
  const workingArms: ArmDef[] = opts.arms.map((a) => ({ ...a, audience: [...a.audience] }));

  // Step 3: invalid-email filter.
  for (const a of workingArms) {
    const before = a.audience.length;
    a.audience = a.audience.filter((c) => {
      const ok = isValidEmail(c.email);
      if (!ok) console.log(`  [${a.key}] dropping invalid email: ${c.email}`);
      return ok;
    });
    if (before !== a.audience.length) {
      console.log(`  [${a.key}] dropped ${before - a.audience.length} invalid email(s)`);
    }
  }

  // Step 4: done-tag idempotency.
  const client = createAgentClient({ workspace: opts.workspace });
  const allEmails = workingArms.flatMap((a) => a.audience.map((c) => c.email));
  if (allEmails.length) {
    const done = await getDoneTagged(client, allEmails, opts.doneTag);
    if (done.size) {
      console.log(`\n  Already done-tagged (skipping): ${done.size}`);
      for (const a of workingArms) {
        const before = a.audience.length;
        a.audience = a.audience.filter((c) => !done.has(c.email.toLowerCase()));
        if (before !== a.audience.length) {
          console.log(`    [${a.key}] dropped ${before - a.audience.length} already-done`);
        }
      }
    }
  }

  const totalToSchedule = workingArms.reduce((s, a) => s + a.audience.length, 0);
  console.log(`\nTotal to schedule: ${totalToSchedule}`);
  if (!totalToSchedule) {
    console.log("Nothing to do.");
    return [];
  }

  // Step 5: source variable_values fetch.
  let baseVV: Record<string, unknown> = {};
  if (opts.sourceCampaignId) {
    console.log("\nLoading source variable_values...");
    const src = await client.sb
      .from("campaigns")
      .select("variable_values")
      .eq("id", opts.sourceCampaignId)
      .single();
    if (src.error || !src.data) throw new Error(`fetch source vars failed: ${src.error?.message}`);
    const srcVV = ((src.data as { variable_values?: Record<string, unknown> }).variable_values) || {};
    for (const k of copyKeys) if (srcVV[k] !== undefined) baseVV[k] = srcVV[k];
  }

  // Step 6: ensureSub pool (skipped on dry-run).
  let subMap = new Map<string, string>();
  if (!opts.dryRun) {
    console.log("\nEnsuring subscribers (parallel)...");
    const allCands: Array<{ cand: Candidate; armKey: string }> = [];
    for (const a of workingArms) for (const cand of a.audience) allCands.push({ cand, armKey: a.key });
    // Group by arm to assign per-arm prospect tags.
    const tagsPerArmCache = new Map<string, string[]>();
    function tagsFor(armKey: string): string[] {
      if (tagsPerArmCache.has(armKey)) return tagsPerArmCache.get(armKey)!;
      const t = typeof opts.prospectTags === "function"
        ? opts.prospectTags(armKey)
        : opts.prospectTags || [];
      tagsPerArmCache.set(armKey, t);
      return t;
    }
    // ensureAllSubscribers takes one tag list, so we ensure per arm separately
    // when prospect tags differ per arm.
    const candsByArm = new Map<string, Candidate[]>();
    for (const { cand, armKey } of allCands) {
      if (!candsByArm.has(armKey)) candsByArm.set(armKey, []);
      candsByArm.get(armKey)!.push(cand);
    }
    for (const [armKey, cands] of candsByArm) {
      const partial = await ensureAllSubscribers(client, cands, {
        concurrency: ensureConcurrency,
        tags: tagsFor(armKey),
      });
      for (const [k, v] of partial) subMap.set(k, v);
    }
    console.log(`  Got ${subMap.size} subscriber IDs (of ${allCands.length})`);
    if (subMap.size < allCands.length * 0.95) {
      throw new Error(`Only ${subMap.size}/${allCands.length} subscribers ensured (< 95%), aborting`);
    }
  }

  // Step 7: chunk + interleave.
  const chunksByArm: Record<string, Candidate[][]> = {};
  for (const a of workingArms) {
    chunksByArm[a.key] = chunkArm(a.audience, chunkSize);
    const last = chunksByArm[a.key][chunksByArm[a.key].length - 1];
    console.log(`  [${a.key}] ${chunksByArm[a.key].length} chunks (last=${last?.length})`);
  }
  const waves = interleaveWaves(workingArms, chunksByArm);
  console.log(`\n  ${waves.length} total send-children to schedule`);

  // Step 8: per-wave clone + patch + send + bulk-tag.
  const firstFire = new Date(opts.scheduledFirstFire).getTime();
  const scheduledChildren: ScheduledChild[] = [];
  for (let w = 0; w < waves.length; w++) {
    const wave = waves[w];
    const scheduledAt = new Date(firstFire + w * staggerSec * 1000).toISOString();

    if (opts.dryRun) {
      console.log(
        `  [DRY ${w + 1}/${waves.length}] ${wave.arm.key} chunk ${wave.chunkIdx + 1} ` +
          `(${wave.chunk.length} recips) @ ${scheduledAt}`,
      );
      continue;
    }

    const subIds: string[] = [];
    for (const c of wave.chunk) {
      const id = subMap.get(c.email.toLowerCase());
      if (id) subIds.push(id);
    }
    if (!subIds.length) {
      console.log(`  [skip] wave ${w + 1}/${waves.length} ${wave.arm.key} #${wave.chunkIdx + 1}: no sub ids`);
      continue;
    }

    const child = await scheduleWave(client, wave, subIds, {
      parentCampaignId: opts.parentCampaignId,
      baseVariableValues: baseVV,
      scheduledAt,
      fromName: opts.fromName,
      fromEmail: opts.fromEmail,
      clickTrackingMode,
      campaignNamePrefix,
    });
    scheduledChildren.push(child);
    console.log(
      `  [${w + 1}/${waves.length}] ${child.armKey} chunk ${child.chunkIdx + 1} ` +
        `(${child.recipients} recips) -> ${child.childId} @ ${child.scheduledAt}`,
    );

    // Done-tag is best-effort idempotency. A flaky agent API (transient 500 /
    // ECONNRESET) on the tag must NOT abort a run whose send already scheduled
    // — that would strand the remaining waves. Log and continue; correctness of
    // re-runs is guarded by deterministic id/email exclusion of scheduled work.
    try {
      await applyDoneTagBatch(client, wave.chunk.map((c) => c.email), opts.doneTag);
    } catch (e) {
      console.warn(`  [warn] done-tag failed for ${child.armKey} #${child.chunkIdx + 1} (send already scheduled): ${(e as Error).message}`);
    }
  }

  // Step 9: summary.
  console.log(`\nDone. ${scheduledChildren.length} children scheduled.`);
  if (scheduledChildren.length) {
    console.log(`First fires at:  ${scheduledChildren[0].scheduledAt}`);
    console.log(`Last fires at:   ${scheduledChildren[scheduledChildren.length - 1].scheduledAt}`);
  }
  return scheduledChildren;
}

// Re-exports so callers can import everything from "src/lib/send-wave".
export type {
  Candidate,
  ArmDef,
  Wave,
  ScheduledChild,
  RunWaveSendOptions,
} from "./types";
export { loadDotEnv, getRequiredEnv } from "./env";
export {
  assertNoEmDash,
  assertNoPlaceholders,
  assertScheduledFresh,
  isValidEmail,
  canonicalEmail,
} from "./guards";
export { createAgentClient } from "./api-client";
