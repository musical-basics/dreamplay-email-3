import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { renderTemplate } from "@/src/lib/render-template";
import { applyAllMergeTags, applyAllMergeTagsWithLog } from "@/src/lib/merge-tags";
import { injectPreheader } from "@/src/lib/email-preheader";
import { proxyEmailImages } from "@/src/lib/image-proxy";
import { STANDARD_TAGS } from "@/src/lib/variable-rules";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

type LogLevel = "info" | "success" | "warn" | "error";
type LogFn = (level: LogLevel, message: string, meta?: Record<string, unknown>) => void;

// Maps the From email's domain to the tracking base URL used for click
// redirects, open pixels, and unsubscribe links. Keeps the visible link
// domain in alignment with the visible sender so mailbox providers don't
// flag the email as a phishing attempt.
//
// Each tracking host is just a CNAME (set up at the registrar) pointing
// at the same Vercel project that hosts /api/track/click, /api/track/open,
// and /unsubscribe. No per-host code.
const FROM_DOMAIN_TO_TRACKING_BASE: Record<string, string> = {
  "musicalbasics.com": "https://link.musicalbasics.com",
  "ultimatepianist.com": "https://link.ultimatepianist.com",
  "dreamplaypianos.com": "https://email.dreamplaypianos.com",
  "email.dreamplaypianos.com": "https://email.dreamplaypianos.com",
};

function pickTrackingBaseUrl(fromEmail: string | null | undefined): string {
  if (fromEmail) {
    const domain = fromEmail.split("@").pop()?.toLowerCase().trim();
    if (domain && FROM_DOMAIN_TO_TRACKING_BASE[domain]) {
      return FROM_DOMAIN_TO_TRACKING_BASE[domain];
    }
  }
  return process.env.TRACKING_BASE_URL || "https://email.dreamplaypianos.com";
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    campaignId,
    fromName,
    fromEmail,
    clickTracking = true,
    clickTrackingMode = "append",
    openTracking = true,
    resendClickTracking = false,
    resendOpenTracking = false,
    overrideSubscriberIds,
    triggeredBy = "agent",
    sync = false,
  } = body as {
    campaignId: string;
    fromName?: string | null;
    fromEmail?: string | null;
    clickTracking?: boolean;
    clickTrackingMode?: "append" | "redirect";
    openTracking?: boolean;
    resendClickTracking?: boolean;
    resendOpenTracking?: boolean;
    overrideSubscriberIds?: string[];
    triggeredBy?: string;
    sync?: boolean;
  };

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const accumulatedLogs: Array<Record<string, unknown> & { ts: string; level: LogLevel; message: string }> = [];

  // Pending send_logs row so failures land in durable storage, not just Vercel logs.
  let sendLogId: string | null = null;
  let sendLogError: string | null = null;
  try {
    const { data: logRow, error: logErr } = await supabaseAdmin
      .from("send_logs")
      .insert({ campaign_id: campaignId, triggered_by: triggeredBy, status: "pending" })
      .select("id")
      .single();
    if (logErr) {
      sendLogError = `${logErr.message} (code: ${(logErr as { code?: string }).code ?? "?"})`;
      console.error("[send-stream] send_logs insert returned error:", logErr);
    } else {
      sendLogId = logRow?.id ?? null;
    }
  } catch (err) {
    sendLogError = err instanceof Error ? err.message : "unknown exception";
    console.error("[send-stream] send_logs insert threw:", err);
  }

  const persistLogs = async () => {
    if (!sendLogId) return;
    const imageLogs = accumulatedLogs.filter(
      (l) =>
        typeof l.message === "string" &&
        (l.message.includes("[ImageProxy]") || l.message.includes("proxied") || l.message.includes("optimized"))
    );
    const lastEntry = accumulatedLogs[accumulatedLogs.length - 1];
    const isDone = lastEntry?.done === true;
    const stats = lastEntry?.stats;
    await supabaseAdmin
      .from("send_logs")
      .update({
        status: isDone ? "success" : "error",
        summary: stats ?? null,
        image_logs: imageLogs.length > 0 ? imageLogs : null,
        raw_log: accumulatedLogs.map((l) => `[${l.ts}] [${l.level.toUpperCase()}] ${l.message}`).join("\n"),
      })
      .eq("id", sendLogId);
  };

  const encoder = new TextEncoder();
  type Ctrl = { enqueue: (v: Uint8Array) => void; close: () => void; error: (e: Error) => void };
  const noopCtrl: Ctrl = { enqueue: () => {}, close: () => {}, error: () => {} };

  const runCore = async (ctrl: Ctrl) => {
    const log: LogFn = (level, message, meta) => {
      const entry = { ts: new Date().toISOString(), level, message, ...(meta || {}) };
      accumulatedLogs.push(entry);
      if (!sync) {
        ctrl.enqueue(encoder.encode(JSON.stringify(entry) + "\n"));
      }
    };

    try {
      log("info", "Fetching campaign data...");
      const { data: campaign, error: campaignError } = await supabaseAdmin
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError || !campaign) {
        log("error", `Campaign not found: ${campaignError?.message || "unknown"}`);
        ctrl.close();
        return;
      }

      log("info", `Campaign: "${campaign.name}"`);

      // Render global template (skip subscriber-owned tags so per-recipient pass can fill them)
      const globalAssets = Object.fromEntries(
        Object.entries(campaign.variable_values || {}).filter(([key]) => !STANDARD_TAGS.includes(key))
      ) as Record<string, string>;
      const globalHtmlContent = renderTemplate(campaign.html_content || "", globalAssets);
      const htmlWithPreheader = injectPreheader(globalHtmlContent, campaign.variable_values?.preview_text);

      // Auto-clone master templates into a child campaign for tracking
      let trackingCampaignId = campaignId;
      if (campaign.is_template) {
        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const childName = `${campaign.name} (Send ${today})`;

        const { data: child, error: childError } = await supabaseAdmin
          .from("campaigns")
          .insert({
            name: childName,
            subject_line: campaign.subject_line,
            html_content: campaign.html_content,
            status: "draft",
            is_template: false,
            parent_template_id: campaignId,
            workspace: campaign.workspace,
            email_type: campaign.email_type || "campaign",
            variable_values: (() => {
              const sourceVars = (campaign.variable_values || {}) as Record<string, unknown>;
              const { subscriber_id: _drop, ...rest } = sourceVars;
              return rest;
            })(),
          })
          .select("id")
          .single();

        if (childError || !child) {
          log("error", `Failed to create child campaign: ${childError?.message}`);
          ctrl.close();
          return;
        }

        trackingCampaignId = child.id;
        log("info", `Created child campaign ${trackingCampaignId} from template`);
      }

      // Recipients
      log("info", "Fetching recipients...");
      const lockedSubscriberId = campaign.variable_values?.subscriber_id;
      const lockedSubscriberIds: string[] | undefined = campaign.variable_values?.subscriber_ids;
      let query = supabaseAdmin.from("subscribers").select("*").eq("status", "active");
      if (overrideSubscriberIds && overrideSubscriberIds.length > 0) {
        query = query.in("id", overrideSubscriberIds);
      } else if (lockedSubscriberIds && lockedSubscriberIds.length > 0) {
        query = query.in("id", lockedSubscriberIds);
      } else if (lockedSubscriberId) {
        query = query.eq("id", lockedSubscriberId);
      }

      const { data: recipients, error: recipientError } = await query;

      if (recipientError || !recipients || recipients.length === 0) {
        log("error", "No active subscribers found");
        ctrl.close();
        return;
      }

      log("info", `Found ${recipients.length} recipient(s)`, { total: recipients.length });

      // Tracking host is picked per-send to align with the From email's
      // domain. Mismatch between the visible From and embedded link domain
      // is a strong phishing signal for mailbox providers (Gmail, Outlook,
      // Mimecast, ATP) and tanks deliverability. Sending from
      // lionel@musicalbasics.com with links going to email.dreamplaypianos.com
      // would fail this alignment.
      //
      // Each From-domain maps to its own tracking subdomain. All point at
      // the same deployed endpoint (currently dp-email-2's
      // /api/track/click, /api/track/open, /unsubscribe) via DNS aliasing.
      // No per-domain code; all hosts hit the same handlers.
      const resolvedFromEmail =
        fromEmail || (campaign.variable_values?.from_email as string | undefined) || null;
      const baseUrl = pickTrackingBaseUrl(resolvedFromEmail);
      log("info", `Tracking base URL: ${baseUrl}  (from: ${resolvedFromEmail ?? "(default)"})`);

      const unsubscribeFooter = `
<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #6b7280; font-family: sans-serif;">
  <p style="margin: 0;">
    No longer want to receive these emails?
    <a href="{{unsubscribe_url}}" style="color: #6b7280; text-decoration: underline;">Unsubscribe here</a>.
  </p>
</div>
`;
      const htmlWithFooter = htmlWithPreheader + unsubscribeFooter;

      log("info", "Proxying & optimizing images...");
      const { html: htmlProxied, stats: proxyStats } = await proxyEmailImages(htmlWithFooter, log);
      if (proxyStats.failures.length > 0) {
        log("error", `${proxyStats.failures.length} image(s) FAILED to proxy — recipients will receive original URLs`, {
          proxy_failures: proxyStats.failures,
        });
      }
      log(
        proxyStats.proxied > 0 ? "success" : "warn",
        proxyStats.proxied > 0
          ? `${proxyStats.proxied} image(s) optimized & proxied (${proxyStats.alreadyProxied} cached, ${proxyStats.unchanged} failed)`
          : `No images proxied — scanned=${proxyStats.scanned}, alreadyProxied=${proxyStats.alreadyProxied}, failed=${proxyStats.unchanged}`,
        { proxy_stats: proxyStats }
      );
      const htmlFinal = htmlProxied;

      let successCount = 0;
      let failureCount = 0;
      let firstResendEmailId: string | null = null;
      const sentRecords: Array<Record<string, unknown>> = [];

      for (let ri = 0; ri < recipients.length; ri++) {
        const sub = recipients[ri];
        const progress = `[${ri + 1}/${recipients.length}]`;

        try {
          log("info", `${progress} Processing ${sub.email}...`);

          const unsubscribeUrl = `${baseUrl}/unsubscribe?s=${sub.id}&c=${trackingCampaignId}&w=${campaign.workspace}`;

          const { html: personalHtml_, log: mergeTagLog } = await applyAllMergeTagsWithLog(htmlFinal, sub, {
            unsubscribe_url: unsubscribeUrl,
            discount_code: campaign.variable_values?.discount_code || "",
          });
          let personalHtml = personalHtml_;

          // Click tracking. Two modes:
          //
          // - "append" (default): sid (subscriber) + cid (campaign) appended
          //   directly to each href. Recipient lands on the destination
          //   immediately; destination-side analytics read sid/cid for email
          //   attribution. No subscriber_events row written for clicks.
          //
          // - "redirect": sid/cid are still appended to the URL, then the
          //   whole thing is wrapped in dp-email-2's /api/track/click redirect
          //   so subscriber_events captures the click event before the user
          //   bounces to the final destination. Destination beacons still see
          //   sid/cid because they ride through the redirect's `u` param.
          if (clickTracking) {
            personalHtml = personalHtml.replace(/href=(["'])(https?:\/\/[^"']+)\1/g, (match, quote, url) => {
              if (url.includes("/unsubscribe")) return match;
              let withParams: string;
              try {
                const parsedUrl = new URL(url);
                parsedUrl.searchParams.set("sid", sub.id);
                parsedUrl.searchParams.set("cid", trackingCampaignId);
                withParams = parsedUrl.toString();
              } catch {
                const sep = url.includes("?") ? "&" : "?";
                withParams = `${url}${sep}sid=${sub.id}&cid=${trackingCampaignId}`;
              }
              if (clickTrackingMode === "redirect") {
                const redirectUrl =
                  `${baseUrl}/api/track/click?c=${encodeURIComponent(trackingCampaignId)}` +
                  `&s=${encodeURIComponent(sub.id)}&u=${encodeURIComponent(withParams)}`;
                return `href=${quote}${redirectUrl}${quote}`;
              }
              return `href=${quote}${withParams}${quote}`;
            });
          }

          // Open tracking pixel
          if (openTracking) {
            const openPixel = `<img src="${baseUrl}/api/track/open?c=${trackingCampaignId}&s=${sub.id}" width="1" height="1" alt="" style="display:none !important;width:1px;height:1px;opacity:0;" />`;
            personalHtml = personalHtml.replace(/<\/body>/i, `${openPixel}</body>`);
            if (!personalHtml.includes(openPixel)) {
              personalHtml += openPixel;
            }
          }

          const personalSubject = await applyAllMergeTags(campaign.subject_line || "", sub);

          const resolvedFromName = fromName || campaign.variable_values?.from_name;
          // resolvedFromEmail is in scope from above (computed once before
          // the per-recipient loop, used for the tracking host pick).

          const sendPayload = {
            from:
              resolvedFromName && resolvedFromEmail
                ? `${resolvedFromName} <${resolvedFromEmail}>`
                : process.env.RESEND_FROM_EMAIL || "DreamPlay <hello@email.dreamplaypianos.com>",
            to: sub.email,
            subject: personalSubject,
            html: personalHtml,
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
            click_tracking: resendClickTracking,
            open_tracking: resendOpenTracking,
          };
          const { data: sendData, error } = await resend.emails.send(
            sendPayload as unknown as Parameters<typeof resend.emails.send>[0]
          );

          if (error) {
            log("error", `${progress} FAILED: ${sub.email} — ${error.message}`);
            failureCount++;
          } else {
            log("success", `${progress} Sent to ${sub.email}`, { resendId: sendData?.id });
            successCount++;
            if (!firstResendEmailId && sendData?.id) {
              firstResendEmailId = sendData.id;
            }
            sentRecords.push({
              campaign_id: trackingCampaignId,
              subscriber_id: sub.id,
              sent_at: new Date().toISOString(),
              variant_sent: campaign.subject_line || null,
              merge_tag_log: mergeTagLog,
            });
          }
        } catch (e) {
          log("error", `${progress} Unexpected error for ${sub.email}: ${e instanceof Error ? e.message : String(e)}`);
          failureCount++;
        }

        if (ri < recipients.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      if (sentRecords.length > 0) {
        log("info", `Inserting ${sentRecords.length} history record(s)...`);
        const { error: historyError } = await supabaseAdmin.from("sent_history").insert(sentRecords);
        if (historyError) {
          log("warn", `Failed to insert history: ${historyError.message}`);
        } else {
          log("success", "History records saved");
        }
      }

      const updateData: Record<string, unknown> = {
        status: "completed",
        updated_at: new Date().toISOString(),
        // total_recipients is what the dp-email-2 dashboard reads to compute
        // openRate = total_opens / total_recipients. Without this update,
        // the Open Rate / Click Rate columns render "—" for every send.
        total_recipients: successCount,
        total_audience_size: recipients.length,
      };
      if (firstResendEmailId) updateData.resend_email_id = firstResendEmailId;
      await supabaseAdmin.from("campaigns").update(updateData).eq("id", trackingCampaignId);

      const summaryMessage = `Broadcast complete: ${successCount} sent, ${failureCount} failed of ${recipients.length}.`;
      log("success", summaryMessage, {
        done: true,
        stats: { sent: successCount, failed: failureCount, total: recipients.length },
        message: summaryMessage,
      });
    } catch (err) {
      log("error", `Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      await persistLogs();
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
      sendLogId,
      sendLogError,
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
