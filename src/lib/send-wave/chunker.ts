import type { ArmDef, Candidate, Wave } from "./types";

/** Split one arm's audience into chunks of at most `chunkSize`. */
export function chunkArm(audience: Candidate[], chunkSize: number): Candidate[][] {
  if (chunkSize <= 0) throw new Error(`chunkSize must be > 0 (got ${chunkSize})`);
  const out: Candidate[][] = [];
  for (let i = 0; i < audience.length; i += chunkSize) {
    out.push(audience.slice(i, i + chunkSize));
  }
  return out;
}

/**
 * Interleave waves across arms.
 *
 *   3 arms (L, M, N), each with 3 chunks ->
 *     L1, M1, N1, L2, M2, N2, L3, M3, N3
 *
 * Why interleave: all arms start receiving emails at roughly the same time
 * (within `staggerSec * (arms.length - 1)` seconds of each other), so any
 * time-of-day effect on opens / clicks is shared across arms and falls out
 * of the per-arm comparison.
 */
export function interleaveWaves(
  arms: ArmDef[],
  chunksByArm: Record<string, Candidate[][]>,
): Wave[] {
  const waves: Wave[] = [];
  const maxChunks = Math.max(0, ...arms.map((a) => chunksByArm[a.key]?.length ?? 0));
  for (let w = 0; w < maxChunks; w++) {
    for (const arm of arms) {
      const c = chunksByArm[arm.key]?.[w];
      if (c && c.length) waves.push({ arm, chunkIdx: w, chunk: c });
    }
  }
  return waves;
}
