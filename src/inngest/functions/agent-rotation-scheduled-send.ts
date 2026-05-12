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
  {
    id: "agent-rotation-scheduled-send",
    // Shared concurrency lock with the other three send-related Inngest
    // functions. See agent-scheduled-send.ts for the full reasoning.
    concurrency: [
      { key: "'global-send-lock'", limit: 1, scope: "account" },
    ],
  },
  { event: "agent.rotation.scheduled-send" },
  async ({ event, step }) => {
    const {
      rotationId,
      subscriberIds,
      scheduledAt,
      fromName,
      fromEmail,
      clickTracking,
      clickTrackingMode,
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
      clickTrackingMode?: "append" | "redirect";
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

    // Generate the idempotency key in its own step so Inngest memoizes
    // it. On a retry of send-rotation below, this step returns the same
    // value, the endpoint sees the same sendKey, and looks up the
    // children created on the first attempt instead of creating a new
    // set with fresh UUIDs.
    const sendKey = await step.run("generate-send-key", async () => {
      return crypto.randomUUID();
    });

    const result = await step.run("send-rotation", async () => {
      const response = await fetch(`${baseUrl}/api/send-rotation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rotationId,
          subscriberIds,
          sendKey,
          fromName: fromName ?? null,
          fromEmail: fromEmail ?? null,
          clickTracking: clickTracking ?? true,
          clickTrackingMode: clickTrackingMode ?? "append",
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
