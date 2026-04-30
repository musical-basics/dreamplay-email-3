import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "dreamplay-email-3",
    time: new Date().toISOString(),
  });
}
