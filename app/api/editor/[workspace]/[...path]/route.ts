import { handleAgentRequest, type AgentRouteContext } from "@/src/agent/handler";

async function withServerAuth(request: Request) {
  const key = process.env.AGENT_API_KEY;
  if (!key) return request;

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${key}`);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    init.body = await request.arrayBuffer();
  }
  return new Request(request.url, init);
}

export async function GET(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(await withServerAuth(request), context);
}

export async function POST(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(await withServerAuth(request), context);
}

export async function PATCH(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(await withServerAuth(request), context);
}

export async function DELETE(request: Request, context: AgentRouteContext) {
  return handleAgentRequest(await withServerAuth(request), context);
}
