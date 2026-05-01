import { inngest } from "@/src/inngest/client";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamplay-email-3.vercel.app";

/**
 * Inngest function: agent-rotation-send (event: agent.rotation.send)
 *
 * Triggered by dp-email-3's Agent API for agent-initiated rotation sends.
 * Thin wrapper around /api/send-rotation, mirroring agent-send for campaigns.
 */
export const agentRotationSend = inngest.createFunction(
  { id: "agent-rotation-send" },
  { event: "agent.rotation.send" },
  async ({ event, step }) => {
    const {
      rotationId,
      subscriberIds,
      fromName,
      fromEmail,
      clickTracking,
      openTracking,
      resendClickTracking,
      resendOpenTracking,
    } = event.data as {
      rotationId: string;
      subscriberIds: string[];
      fromName?: string | null;
      fromEmail?: string | null;
      clickTracking?: boolean;
      openTracking?: boolean;
      resendClickTracking?: boolean;
      resendOpenTracking?: boolean;
    };

    const result = await step.run("send-rotation", async () => {
      const response = await fetch(`${baseUrl}/api/send-rotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rotationId,
          subscriberIds,
          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          clickTracking: clickTracking ?? true,
          openTracking: openTracking ?? true,
          resendClickTracking: resendClickTracking ?? false,
          resendOpenTracking: resendOpenTracking ?? false,
          triggeredBy: "agent-rotation",
          sync: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`send-rotation responded ${response.status}: ${errText}`);
      }

      return response.json();
    });

    return {
      event: "agent.rotation.send.completed",
      body: {
        rotationId,
        stats: (result as { stats?: unknown }).stats || {},
      },
    };
  }
);
