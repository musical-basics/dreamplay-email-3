import type { Wave, ScheduledChild } from "./types";
import type { SendWaveClient } from "./api-client";
import { assertNoEmDash } from "./guards";

type ScheduleOneOptions = {
  parentCampaignId: string;
  baseVariableValues: Record<string, unknown>;
  scheduledAt: string;
  fromName: string;
  fromEmail: string;
  clickTrackingMode: "append" | "redirect";
  /** Used for the child campaign name prefix, e.g. "belgium-logistics-lmn". */
  campaignNamePrefix: string;
};

/**
 * Clone the parent campaign, patch HTML/subject/vars, verify, then POST /send
 * with the given scheduledAt. Returns the child ID and recipient count.
 */
export async function scheduleWave(
  client: SendWaveClient,
  wave: Wave,
  subIdsForChunk: string[],
  opts: ScheduleOneOptions,
): Promise<ScheduledChild> {
  const { arm, chunkIdx, chunk } = wave;
  if (!subIdsForChunk.length) {
    throw new Error(`scheduleWave called with empty subIdsForChunk for ${arm.key} #${chunkIdx + 1}`);
  }

  const name = `${opts.campaignNamePrefix} ${arm.key} #${chunkIdx + 1} / ${opts.scheduledAt.slice(11, 16)}Z`;

  const clone = await client.api<{ data: { id: string } }>(
    `/api/agent/${client.workspace}/campaigns/${opts.parentCampaignId}/clone`,
    { method: "POST", body: JSON.stringify({ name, subscriber_ids: subIdsForChunk }) },
  );
  const childId = clone.data.id;

  const mergedVV: Record<string, unknown> = {
    ...opts.baseVariableValues,
    subscriber_ids: subIdsForChunk,
  };
  const upd = await client.sb
    .from("campaigns")
    .update({
      html_content: arm.html,
      subject_line: arm.subject,
      variable_values: mergedVV,
      updated_at: new Date().toISOString(),
    })
    .eq("id", childId);
  if (upd.error) throw new Error(`patch failed for ${childId}: ${upd.error.message}`);

  // Round-trip verify the write actually landed (catches mid-air subject /
  // subscriber_ids divergence that has bitten past sends).
  const v = await client.sb
    .from("campaigns")
    .select("html_content,subject_line,variable_values")
    .eq("id", childId)
    .single();
  const got = v.data as {
    html_content: string;
    subject_line: string;
    variable_values: { subscriber_ids?: unknown };
  } | null;
  if (!got) throw new Error(`could not re-fetch child ${childId} for verification`);
  if (got.subject_line !== arm.subject) {
    throw new Error(`subject mismatch on ${childId}: db has "${got.subject_line}"`);
  }
  const ids = got.variable_values?.subscriber_ids;
  if (!Array.isArray(ids) || ids.length !== subIdsForChunk.length) {
    throw new Error(`subscriber_ids wrong on ${childId} (got ${Array.isArray(ids) ? ids.length : "non-array"}, expected ${subIdsForChunk.length})`);
  }
  assertNoEmDash(got.html_content, `child campaign ${childId} html_content`);

  await client.api(`/api/agent/${client.workspace}/campaigns/${childId}/send`, {
    method: "POST",
    body: JSON.stringify({
      fromName: opts.fromName,
      fromEmail: opts.fromEmail,
      clickTracking: true,
      clickTrackingMode: opts.clickTrackingMode,
      openTracking: true,
      scheduledAt: opts.scheduledAt,
    }),
  });

  return {
    armKey: arm.key,
    chunkIdx,
    childId,
    scheduledAt: opts.scheduledAt,
    recipients: chunk.length,
  };
}
