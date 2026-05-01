import { handleAgentRequest, type AgentRouteContext } from "@/src/agent/handler";

export function GET(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(request, context);
}

export function POST(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(request, context);
}

export function PATCH(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(request, context);
}

export function DELETE(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(request, context);
}
