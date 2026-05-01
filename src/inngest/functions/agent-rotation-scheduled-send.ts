import { inngest } from "@/src/inngest/client";
import { createAdminClient } from "@/src/lib/supabase";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dreamplay-email-3.vercel.app";

/**
 * Inngest function: agent-rotation-scheduled-send
 * (event: agent.rotation.scheduled-send)
 *
 * Sleeps until scheduledAt, re-checks the rotation hasn't been cancelled,
 * then calls /api/send-rotation. Mirrors agent-scheduled-send for campaigns.
 */
export const agentRotationScheduledSend = inngest.createFunction(
  { id: "agent-rotation-scheduled-send" },
  { event: "agent.rotation.scheduled-send" },
  async ({ event, step }) => {
    const {
      rotationId,
      subscriberIds,
      scheduledAt,
      fromName,
      fromEmail,
      clickTracking,
      openTracking,
      resendClickTracking,
      resendOpenTracking,
    } = event.data as {
      rotationId: string;
      subscriberIds: string[];
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

    const rotation = await step.run("check-rotation", async () => {
      const { data, error } = await supabase
        .from("rotations")
        .select("id, scheduled_status")
        .eq("id", rotationId)
        .maybeSingle();

      if (error) throw new Error(`check-rotation failed: ${error.message}`);
      if (!data) throw new Error("Rotation not found (may have been deleted)");
      return data;
    });

    if (rotation.scheduled_status === "cancelled") {
      return { message: "Schedule was cancelled", rotationId };
    }
    if (rotation.scheduled_status === "sent") {
      return { message: "Rotation already sent", rotationId };
    }

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
          triggeredBy: "agent-rotation-scheduled",
          sync: true,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`send-rotation responded ${response.status}: ${errText}`);
      }
      return response.json();
    });

    await step.run("update-status", async () => {
      await supabase
        .from("rotations")
        .update({ scheduled_status: "sent", updated_at: new Date().toISOString() })
        .eq("id", rotationId);
    });

    return {
      message: "Scheduled rotation sent successfully",
      rotationId,
      result,
    };
  }
);
