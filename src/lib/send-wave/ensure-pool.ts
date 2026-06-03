import type { Candidate } from "./types";
import type { SendWaveClient } from "./api-client";

type EnsureOptions = {
  /** Parallel ensureSub calls. */
  concurrency: number;
  /** Tags to apply to every ensured subscriber (campaign-level provenance). */
  tags: string[];
};

/**
 * Upsert one subscriber via /api/agent/{ws}/subscribers and return its id.
 *
 * Field normalization mirrors what's been working in past schedulers:
 * - skips first/last name when "Blank" or length < threshold
 * - uses `shipping_city` (the agent schema's actual key) instead of `city`
 *   (the latter is silently stripped by Zod, which lost city data on every
 *    pre-2026-06-03 send)
 */
async function ensureSubscriber(
  client: SendWaveClient,
  cand: Candidate,
  tags: string[],
): Promise<string> {
  const body: Record<string, unknown> = {
    email: cand.email,
    status: "active",
    tags,
  };
  const fn = cand.first_name?.trim();
  const ln = cand.last_name?.trim();
  if (fn && fn.length >= 3 && fn.toLowerCase() !== "blank") body.first_name = fn;
  if (ln && ln.length >= 2 && ln.toLowerCase() !== "blank") body.last_name = ln;
  if (cand.country) body.country_code = cand.country;
  if (cand.city) body.shipping_city = cand.city;
  if (cand.zip) body.shipping_zip = cand.zip;

  const u = await client.api<{ data: { id: string } }>(
    `/api/agent/${client.workspace}/subscribers`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return u.data.id;
}

/**
 * Ensure many subscribers in parallel. Returns a map of (lowercased email -> subscriberId).
 * Failures are logged and counted but do not abort the pool. The caller decides
 * whether to abort based on the final pool / requested-count ratio.
 */
export async function ensureAllSubscribers(
  client: SendWaveClient,
  candidates: Candidate[],
  opts: EnsureOptions,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let next = 0;
  let done = 0;
  const total = candidates.length;
  await Promise.all(
    Array.from({ length: opts.concurrency }, async () => {
      for (;;) {
        const idx = next++;
        if (idx >= total) return;
        const cand = candidates[idx];
        try {
          const id = await ensureSubscriber(client, cand, opts.tags);
          map.set(cand.email.toLowerCase(), id);
        } catch (e) {
          console.error(`  ensureSub failed for ${cand.email}: ${(e as Error).message}`);
        }
        done++;
        if (done % 100 === 0 || done === total) {
          console.log(`  ensured ${done}/${total}`);
        }
      }
    }),
  );
  return map;
}
