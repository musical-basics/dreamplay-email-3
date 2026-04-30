import { inngest } from "@/src/inngest/client";
import { createAdminClient } from "@/src/lib/supabase";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamplay-email-3.vercel.app";

/**
 * Inngest function: agent-scheduled-send (event: agent.campaign.scheduled-send)
 *
 * Sleeps until scheduledAt, re-checks the campaign hasn't been cancelled,
 * then calls send-stream. Mirrors dp-email-2's scheduledCampaignSend on a
 * separate event namespace.
 */
export const agentScheduledSend = inngest.createFunction(
  { id: "agent-scheduled-campaign-send" },
  { event: "agent.campaign.scheduled-send" },
  async ({ event, step }) => {
    const { campaignId, scheduledAt, fromName, fromEmail, clickTracking, openTracking, resendClickTracking, resendOpenTracking } =
      event.data as {
        campaignId: string;
        scheduledAt: string;
        fromName?: string | null;
        fromEmail?: string | null;
        clickTracking?: boolean;
        openTracking?: boolean;
        resendClickTracking?: boolean;
        resendOpenTracking?: boolean;
      };

    await step.sleepUntil("wait-for-schedule", new Date(scheduledAt));

    const supabase = createAdminClient();

    const campaign = await step.run("check-campaign", async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, scheduled_status, status")
        .eq("id", campaignId)
        .maybeSingle();

      if (error) throw new Error(`check-campaign failed: ${error.message}`);
      if (!data) throw new Error("Campaign not found (may have been deleted)");
      return data;
    });

    if (campaign.scheduled_status === "cancelled") {
      return { message: "Schedule was cancelled", campaignId };
    }
    if (campaign.scheduled_status === "sent" || campaign.status === "completed") {
      return { message: "Campaign already sent", campaignId };
    }

    const result = await step.run("send-broadcast", async () => {
      const response = await fetch(`${baseUrl}/api/send-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          clickTracking: clickTracking ?? true,
          openTracking: openTracking ?? true,
          resendClickTracking: resendClickTracking ?? false,
          resendOpenTracking: resendOpenTracking ?? false,
          triggeredBy: "agent-scheduled",
          sync: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`send-stream responded ${response.status}: ${errText}`);
      }
      return response.json();
    });

    await step.run("update-status", async () => {
      await supabase
        .from("campaigns")
        .update({ scheduled_status: "sent", updated_at: new Date().toISOString() })
        .eq("id", campaignId);
    });

    return {
      message: "Scheduled campaign sent successfully",
      campaignId,
      result,
    };
  }
);
