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

      for (const [templateId, batchSubscriberIds] of Object.entries(grouped)) {
        const template = templateMap[templateId];
        if (!template) continue;

        log("info", `--- Batch: "${template.name}" (${batchSubscriberIds.length} recipients) ---`);

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

        log("info", `Created child campaign ${child.id}, calling send-stream...`);

        const response = await fetch(`${baseUrl}/api/send-stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: child.id,
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

      const newCursor = ((rotation.cursor_position ?? 0) + subscribers.length) % totalCampaigns;
      await supabaseAdmin
        .from("rotations")
        .update({ cursor_position: newCursor, updated_at: new Date().toISOString() })
        .eq("id", rotationId);

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
