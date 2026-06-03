/**
 * Shared types for the send-wave SDK.
 *
 * A "wave send" is a multi-arm campaign send where each arm has its own
 * subject + HTML + audience, chunked at the per-Vercel-invocation safe size
 * and fired with a stagger between children so the global send-lock can drain
 * cleanly between fires.
 */

/**
 * One recipient candidate. Shape matches what the Python audience builders
 * (`_work/build-*-audience.py`) write to JSON.
 */
export type Candidate = {
  email: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  city?: string;
  zip?: string;
  tags?: string[];
  source?: string;
};

/**
 * Definition of one arm in a multi-arm send. Each arm is a fully independent
 * (subject, body, audience) triple. The runner will chunk each arm's audience
 * and interleave the resulting send-children across arms.
 */
export type ArmDef = {
  /** Short label used in child names, prospect tags, and logs. e.g. "L", "M", "N", "short", "c" */
  key: string;
  /** Email subject line for this arm. */
  subject: string;
  /** Rendered HTML body (already merge-tag-templated where the send pipeline expects placeholders). */
  html: string;
  /** Recipient candidates for this arm (already de-duped and pre-split). */
  audience: Candidate[];
};

/**
 * One scheduled child. Wave order is the interleaved fire order:
 *   wave 0 = first arm chunk 1, wave 1 = second arm chunk 1, ..., wave N = first arm chunk 2, ...
 */
export type Wave = {
  arm: ArmDef;
  chunkIdx: number;
  chunk: Candidate[];
};

/**
 * Result of one scheduled child.
 */
export type ScheduledChild = {
  armKey: string;
  chunkIdx: number;
  childId: string;
  scheduledAt: string;
  recipients: number;
};

/**
 * Top-level options for `runWaveSend`. Anything not optional is a deliberate
 * "you must say it explicitly" — these are the values that, if defaulted,
 * have caused real bugs in this repo.
 */
export type RunWaveSendOptions = {
  /** Email workspace, e.g. "musicalbasics". */
  workspace: string;
  /** Parent campaign UUID to clone per child (e.g., the "Variant B" template). */
  parentCampaignId: string;
  /**
   * Optional source campaign UUID whose `variable_values` (logo_src etc.) get
   * merged into every child's vars. Omit if not needed.
   */
  sourceCampaignId?: string;
  /** Which template variable keys to copy from sourceCampaignId. Default: ["logo_src"]. */
  copyVariableKeys?: string[];

  /** Arms to fire. Subject + HTML + audience per arm. */
  arms: ArmDef[];

  /** ISO timestamp for the first child fire. Must be >= now + 60s. */
  scheduledFirstFire: string;
  /** Seconds between consecutive child fires. Defaults to 240. */
  staggerSec?: number;
  /** Max recipients per child. Defaults to 250 (~25% Vercel headroom). */
  chunkSize?: number;
  /** Concurrent ensureSub calls. Defaults to 8. */
  ensureConcurrency?: number;

  /** Idempotency tag applied to recipients post-fire. Honored by audience builders for dedup across re-runs. */
  doneTag: string;
  /**
   * Optional prospect tag (or prefix). If a string, every recipient gets the literal tag.
   * If a function, called per-arm to produce the prospect tags for that arm
   * (e.g., return [`belgium-logistics-lmn-2026-06-03:${armKey.toLowerCase()}`]).
   */
  prospectTags?: string[] | ((armKey: string) => string[]);

  /** "From" name on the sent email. */
  fromName: string;
  /** "From" email. */
  fromEmail: string;

  /**
   * Click-tracking mode. Defaults to "append" (the only safe choice on Gmail
   * after the 2026-05-03 redirect-mode incident). "redirect" is allowed but
   * the SDK warns.
   */
  clickTrackingMode?: "append" | "redirect";

  /**
   * If true, log the plan but skip clone / patch / send / bulk-tag. Useful for
   * verifying the chunking and timing before committing.
   */
  dryRun?: boolean;
};
