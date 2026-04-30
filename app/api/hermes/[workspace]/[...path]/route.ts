import { handleHermesRequest, type HermesRouteContext } from "@/src/hermes/handler";

export function GET(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(request, context);
}

export function POST(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(request, context);
}

export function PATCH(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(request, context);
}

export function DELETE(request: Request, context: HermesRouteContext) {
  return handleHermesRequest(request, context);
}
