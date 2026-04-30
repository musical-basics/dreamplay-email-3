import { NextResponse } from "next/server";
import { createAdminClient } from "@/src/lib/supabase";

export async function GET(request: Request) {
  if (!process.env.HERMES_API_KEY) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const folder = url.searchParams.get("folder")?.trim() || "";
    const starredOnly = url.searchParams.get("starred") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || "60"), 200);

    const supabase = createAdminClient();
    let query = supabase
      .from("media_assets")
      .select("id,filename,asset_type,public_url,folder_path,is_starred,created_at")
      .eq("is_deleted", false)
      .eq("asset_type", "image")
      .order("is_starred", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) query = query.ilike("filename", `%${search}%`);
    if (folder) query = query.eq("folder_path", folder);
    if (starredOnly) query = query.eq("is_starred", true);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[editor-assets] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
