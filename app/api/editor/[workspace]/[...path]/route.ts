import { handleHermesRequest, type HermesRouteContext } from "@/src/hermes/handler";

async function withServerAuth(request: Request) {
  const key = process.env.HERMES_API_KEY;
  if (!key) return request;

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${key}`);

  const init: RequestInit = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    init.body = await request.arrayBuffer();
  }
  return new Request(request.url, init);
}

export async function GET(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(await withServerAuth(request), context);
}

export async function POST(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(await withServerAuth(request), context);
}

export async function PATCH(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(await withServerAuth(request), context);
}

export async function DELETE(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(await withServerAuth(request), context);
}
