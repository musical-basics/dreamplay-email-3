import { serve } from "inngest/next";
import { inngest } from "@/src/inngest/client";
import { agentSend } from "@/src/inngest/functions/agent-send";
import { agentScheduledSend } from "@/src/inngest/functions/agent-scheduled-send";
import { agentRotationSend } from "@/src/inngest/functions/agent-rotation-send";
import { agentRotationScheduledSend } from "@/src/inngest/functions/agent-rotation-scheduled-send";

// Must match send-stream's maxDuration. The Inngest handler holds an HTTP
// connection open to send-stream; if Vercel kills the outer handler before
// send-stream finishes, the send aborts mid-flight even though send-stream
// has its own maxDuration.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [agentSend, agentScheduledSend, agentRotationSend, agentRotationScheduledSend],
});
