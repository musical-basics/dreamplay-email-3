import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

export function zodErrorResponse(error: ZodError) {
  return errorResponse("VALIDATION_ERROR", 422, error.flatten());
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function requireAgentAuth(request: Request) {
  const expected = process.env.AGENT_API_KEY;
  const actual = request.headers.get("authorization");

  if (!expected) {
    return errorResponse("AGENT_API_KEY is not configured", 503);
  }

  if (actual !== `Bearer ${expected}`) {
    return errorResponse("Unauthorized", 401);
  }

  return null;
}
