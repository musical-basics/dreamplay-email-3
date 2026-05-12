import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

// Round-robin rotation send. Ported from dp-email-2 with one critical
// difference: this version delegates to dp-email-3's own /api/send-stream,
// which appends sid/cid query params directly to each href instead of
// redirecting through dp-email-2's /api/track/click whitelist (which
// rejects musicalbasics.com URLs).
//
// Flow per request:
//   1. Load the rotation row (campaign_ids, cursor_position).
//   2. Round-robin assign each subscriber to one of the rotation's
//      template campaigns starting from cursor_position.
//   3. For each (template, subscriber batch) pair:
//        a. Insert a child campaign that points back at the template
//           (parent_template_id) and the rotation (rotation_id).
//        b. POST to /api/send-stream with the child id and the batch's
//           subscriber ids.
//   4. Advance the rotation's cursor by the total subscriber count.

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type LogLevel = "info" | "success" | "warn" | "error";

type LogEntry = {
  ts: string;
  level: LogLevel;
  message: string;
  done?: boolean;
  stats?: { sent: number; failed: number; total: number };
  [key: string]: unknown;
};

type Ctrl = { enqueue: (v: Uint8Array) => void; close: () => void; error: (e: Error) => void };

export async function POST(request: Request) {
  const body = await request.json();
  const {
    rotationId,
    subscriberIds,
    sendKey,
    fromName,
    fromEmail,
    clickTracking = true,
    clickTrackingMode = "append",
    openTracking = true,
    resendClickTracking = false,
    resendOpenTracking = false,
    triggeredBy = "agent-rotation",
    sync = false,
  } = body as {
    rotationId: string;
    subscriberIds: string[];
    // Idempotency key from the caller. The caller (Inngest function)
    // generates this once per invocation inside its own step.run so it
    // survives step retries. We stamp it into each child campaign's
    // variable_values.send_key and look children up by it. A retry of
    // this endpoint with the same sendKey reuses the children created
    // by the first attempt instead of creating a fresh set with new
    // UUIDs (which would all bypass send-stream's per-campaign
    // idempotency check). Legacy callers that don't pass a sendKey
    // get the old non-idempotent behavior with a logged warning.
    sendKey?: string;
    fromName?: string | null;
    fromEmail?: string | null;
    clickTracking?: boolean;
    clickTrackingMode?: "append" | "redirect";
    openTracking?: boolean;
    resendClickTracking?: boolean;
    resendOpenTracking?: boolean;
    triggeredBy?: string;
    sync?: boolean;
  };

  if (!rotationId || !Array.isArray(subscriberIds) || subscriberIds.length === 0) {
    return NextResponse.json(
      { error: "rotationId and non-empty subscriberIds are required" },
      { status: 400 }
    );
  }

  const supabaseAdmin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamplay-email-3.vercel.app";
  const encoder = new TextEncoder();
  const accumulatedLogs: LogEntry[] = [];
  const noopCtrl: Ctrl = { enqueue: () => {}, close: () => {}, error: () => {} };

  const runCore = async (ctrl: Ctrl) => {
    const log = (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
      const entry: LogEntry = { ts: new Date().toISOString(), level, message, ...(meta || {}) };
      accumulatedLogs.push(entry);
      if (!sync) {
        ctrl.enqueue(encoder.encode(JSON.stringify(entry) + "\n"));
      }
    };

    try {
      log("info", "Fetching rotation data...");
      const { data: rotation, error: rotError } = await supabaseAdmin
        .from("rotations")
        .select("*")
        .eq("id", rotationId)
        .single();

      if (rotError || !rotation) {
        log("error", `Rotation not found: ${rotError?.message || "unknown"}`);
        ctrl.close();
        return;
      }

      const campaignIds: string[] = rotation.campaign_ids || [];
      const totalCampaigns = campaignIds.length;
      if (totalCampaigns === 0) {
        log("error", "Rotation has no campaigns");
        ctrl.close();
        return;
      }

      log("info", `Rotation: "${rotation.name}", ${totalCampaigns} campaign(s)`);

      const { data: templates, error: tmplError } = await supabaseAdmin
        .from("campaigns")
        .select("*")
        .in("id", campaignIds);

      if (tmplError || !templates || templates.length === 0) {
        log("error", `Template campaigns not found: ${tmplError?.message || "unknown"}`);
        ctrl.close();
        return;
      }

      const templateMap = Object.fromEntries(templates.map((t) => [t.id, t]));
      log("info", `Loaded ${templates.length} template(s): ${templates.map((t) => `"${t.name}"`).join(", ")}`);

      log("info", "Fetching subscribers...");
      const { data: subscribers, error: subError } = await supabaseAdmin
        .from("subscribers")
        .select("id")
        .in("id", subscriberIds)
        .eq("status", "active");

      if (subError || !subscribers || subscribers.length === 0) {
        log("error", `No active subscribers found: ${subError?.message || "none matched"}`);
        ctrl.close();
        return;
      }

      log("info", `Found ${subscribers.length} active subscriber(s) of ${subscriberIds.length} requested`);

      let cursor: number = rotation.cursor_position ?? 0;
      const grouped: Record<string, string[]> = {};
      for (const sub of subscribers) {
        const assignedCampaignId = campaignIds[cursor % totalCampaigns];
        if (!grouped[assignedCampaignId]) grouped[assignedCampaignId] = [];
        grouped[assignedCampaignId].push(sub.id);
        cursor++;
      }

      let totalSent = 0;
      let totalFailed = 0;
      const totalRecipients = subscribers.length;
      let anyNewChildCreated = false;

      if (!sendKey) {
        log(
          "warn",
          "No sendKey provided. Child campaign creation is NOT idempotent for this invocation; an Inngest retry will create a duplicate set of children and double-send. Update the caller to pass a stable sendKey."
        );
      }

      for (const [templateId, batchSubscriberIds] of Object.entries(grouped)) {
        const template = templateMap[templateId];
        if (!template) continue;

        log("info", `--- Batch: "${template.name}" (${batchSubscriberIds.length} recipients) ---`);

        let childId: string | null = null;

        if (sendKey) {
          // .limit(1) instead of .maybeSingle() so a rare race that
          // produced two children for the same key (e.g., a transient
          // lookup error caused fall-through-to-create on the first
          // run, then the retry found both) doesn't error out — we
          // just pick the oldest one and reuse it. Any extra child is
          // harmless: send-stream's per-campaign idempotency check
          // means a second send-stream call against the orphan still
          // skips every already-sent recipient.
          const { data: existingRows, error: existingError } = await supabaseAdmin
            .from("campaigns")
            .select("id")
            .eq("rotation_id", rotationId)
            .eq("parent_template_id", templateId)
            .eq("variable_values->>send_key", sendKey)
            .order("created_at", { ascending: true })
            .limit(1);
          if (existingError) {
            log("warn", `Failed to look up existing child for "${template.name}" by sendKey: ${existingError.message}. Falling through to create.`);
          } else if (existingRows && existingRows.length > 0) {
            childId = existingRows[0].id as string;
            log("info", `Reusing existing child ${childId} for sendKey=${sendKey} (retry detected).`);
          }
        }

        if (!childId) {
          const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const { data: child, error: childError } = await supabaseAdmin
            .from("campaigns")
            .insert({
              name: `${template.name} (Rotation ${today})`,
              subject_line: template.subject_line,
              html_content: template.html_content,
              status: "draft",
              is_template: false,
              parent_template_id: templateId,
              rotation_id: rotationId,
              workspace: template.workspace,
              email_type: template.email_type || "campaign",
              variable_values: (() => {
                const sourceVars = (template.variable_values || {}) as Record<string, unknown>;
                const { subscriber_id: _drop1, subscriber_ids: _drop2, ...rest } = sourceVars;
                if (sendKey) (rest as Record<string, unknown>).send_key = sendKey;
                return rest;
              })(),
            })
            .select("id")
            .single();

          if (childError || !child) {
            log("error", `Failed to create child campaign for "${template.name}": ${childError?.message}`);
            totalFailed += batchSubscriberIds.length;
            continue;
          }
          childId = child.id as string;
          anyNewChildCreated = true;
          log("info", `Created child campaign ${childId}, calling send-stream...`);
        } else {
          log("info", `Calling send-stream with existing child ${childId}...`);
        }

        const response = await fetch(`${baseUrl}/api/send-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: childId,
            overrideSubscriberIds: batchSubscriberIds,
            fromName: fromName || template.variable_values?.from_name,
            fromEmail: fromEmail || template.variable_values?.from_email,
            clickTracking,
            clickTrackingMode,
            openTracking,
            resendClickTracking,
            resendOpenTracking,
            triggeredBy,
            sync: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          log("error", `send-stream responded ${response.status} for "${template.name}": ${errText}`);
          totalFailed += batchSubscriberIds.length;
          continue;
        }

        const result = (await response.json()) as { stats?: { sent?: number; failed?: number } };
        const batchSent = result.stats?.sent ?? 0;
        const batchFailed = result.stats?.failed ?? batchSubscriberIds.length - batchSent;
        totalSent += batchSent;
        totalFailed += batchFailed;
        log("info", `Batch "${template.name}" done: ${batchSent} sent, ${batchFailed} failed`);
      }

      // Only advance the cursor if this invocation actually created at
      // least one new child. If every child was reused, this is a
      // retry of an earlier completed (or partially completed) run —
      // either the original run already advanced the cursor, or it
      // crashed before it had a chance to and the next legitimate
      // rotation send will advance from the same position. Advancing
      // here on every retry would shift the rotation forward by
      // subscribers.length each time, throwing off the round-robin
      // assignment for all subsequent sends.
      if (anyNewChildCreated) {
        const newCursor = ((rotation.cursor_position ?? 0) + subscribers.length) % totalCampaigns;
        await supabaseAdmin
          .from("rotations")
          .update({ cursor_position: newCursor, updated_at: new Date().toISOString() })
          .eq("id", rotationId);
      } else {
        log("info", "All children were reused from a prior run — skipping cursor advance.");
      }

      const summary = `Rotation send complete: ${totalSent} sent, ${totalFailed} failed of ${totalRecipients}.`;
      log("success", summary, {
        done: true,
        stats: { sent: totalSent, failed: totalFailed, total: totalRecipients },
        message: summary,
      });
    } catch (err) {
      log("error", `Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      ctrl.close();
    }
  };

  if (sync) {
    await runCore(noopCtrl);
    const lastEntry = accumulatedLogs[accumulatedLogs.length - 1];
    return NextResponse.json({
      done: lastEntry?.done ?? false,
      stats: lastEntry?.stats ?? null,
      logLines: accumulatedLogs.length,
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      runCore(controller as unknown as Ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "Transfer-Encoding": "chunked",
    },
  });
}
