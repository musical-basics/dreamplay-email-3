import { inngest } from "@/src/inngest/client";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamplay-email-3.vercel.app";

/**
 * Inngest function: agent-send (event: agent.campaign.send)
 *
 * Triggered by dp-email-3's Hermes API for agent-initiated sends. Mirrors
 * dp-email-2's api-send pattern but on a separate event namespace so the
 * two apps' pipelines don't double-process each other's events.
 *
 * Acts as a thin Inngest wrapper around /api/send-stream.
 */
export const agentSend = inngest.createFunction(
  { id: "agent-send" },
  { event: "agent.campaign.send" },
  async ({ event, step }) => {
    const {
      campaignId,
      fromName,
      fromEmail,
      clickTracking,
      openTracking,
      resendClickTracking,
      resendOpenTracking,
    } = event.data as {
      campaignId: string;
      fromName?: string | null;
      fromEmail?: string | null;
      clickTracking?: boolean;
      openTracking?: boolean;
      resendClickTracking?: boolean;
      resendOpenTracking?: boolean;
    };

    const result = await step.run("send-via-stream", async () => {
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
          triggeredBy: "agent",
          sync: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`send-stream responded ${response.status}: ${errText}`);
      }

      return response.json();
    });

    return {
      event: "agent.campaign.send.completed",
      body: {
        campaignId,
        stats: (result as { stats?: unknown }).stats || {},
      },
    };
  }
);
