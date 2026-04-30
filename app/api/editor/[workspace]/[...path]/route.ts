import { handleHermesRequest, type HermesRouteContext } from "@/src/hermes/handler";

function withServerAuth(request: Request) {
  const key = process.env.HERMES_API_KEY;
  if (!key) return request;
  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${key}`);
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

export function GET(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(withServerAuth(request), context);
}

export function POST(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(withServerAuth(request), context);
}

export function PATCH(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(withServerAuth(request), context);
}

export function DELETE(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(withServerAuth(request), context);
}
