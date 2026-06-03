import type { SendWaveClient } from "./api-client";

/**
 * Return the subset of `emails` that already carry `doneTag` in the email
 * subscribers table. These should be skipped to keep re-runs idempotent.
 */
export async function getDoneTagged(
  client: SendWaveClient,
  emails: string[],
  doneTag: string,
): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < emails.length; i += 200) {
    const chunk = emails.slice(i, i + 200);
    const r = await client.sb
      .from("subscribers")
      .select("email,tags")
      .eq("workspace", client.workspace)
      .in("email", chunk);
    if (r.error) throw r.error;
    for (const row of r.data || []) {
      if (((row.tags as string[]) || []).includes(doneTag)) {
        out.add((row.email as string).toLowerCase());
      }
    }
  }
  return out;
}

/**
 * Apply `doneTag` to a batch of emails via the bulk-tag endpoint, in groups
 * of `batchSize` (default 200). Idempotent — bulk-tag is additive.
 */
export async function applyDoneTagBatch(
  client: SendWaveClient,
  emails: string[],
  doneTag: string,
  batchSize = 200,
): Promise<void> {
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    await client.api(`/api/agent/${client.workspace}/subscribers/bulk-tag`, {
      method: "POST",
      body: JSON.stringify({ emails: batch, tags: [doneTag] }),
    });
  }
}
