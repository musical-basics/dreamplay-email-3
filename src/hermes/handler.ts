import { NextResponse } from "next/server";
import { Inngest } from "inngest";
import { createAdminClient } from "@/src/lib/supabase";
import { errorResponse, json, readJson, requireHermesAuth, zodErrorResponse } from "@/src/lib/http";
import { listEnvelope, paginationFromUrl, rangeFor } from "@/src/lib/pagination";
import { workspaceSchema, type Workspace } from "@/src/lib/workspaces";
import { generateCopilotEmail } from "@/src/ai/copilot";
import {
  bulkTagSchema,
  campaignCreateSchema,
  campaignPatchSchema,
  chainCreateSchema,
  cloneCampaignSchema,
  copilotSchema,
  sendSchema,
  subscriberPatchSchema,
  subscriberUpsertSchema,
  tagCreateSchema,
  triggerCreateSchema,
} from "./schemas";

export type HermesRouteContext = {
  params: Promise<{ workspace: string; path?: string[] }>;
};

const campaignListFields = [
  "id",
  "name",
  "subject_line",
  "status",
  "email_type",
  "is_template",
  "is_ready",
  "is_starred_template",
  "parent_template_id",
  "category",
  "total_recipients",
  "total_opens",
  "total_clicks",
  "scheduled_at",
  "scheduled_status",
  "workspace",
  "created_at",
  "updated_at",
].join(",");

const campaignDetailFields = `${campaignListFields},html_content,variable_values,sent_from_email`;

const subscriberFields = [
  "id",
  "email",
  "first_name",
  "last_name",
  "status",
  "tags",
  "smart_tags",
  "country",
  "country_code",
  "phone_code",
  "phone_number",
  "shipping_city",
  "workspace",
  "created_at",
  "updated_at",
].join(",");

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function routeNotFound(resource: string) {
  return errorResponse(`Unknown Hermes resource: ${resource}`, 404);
}

async function ensureTagDefinitions(workspace: Workspace, tags: string[]) {
  const cleanTags = uniqueStrings(tags);
  if (!cleanTags.length) return;

  const supabase = createAdminClient();
  const withWorkspace = cleanTags.map((name) => ({ name, color: "#6b7280", workspace }));
  const withoutWorkspace = cleanTags.map((name) => ({ name, color: "#6b7280" }));

  const first = await supabase.from("tag_definitions").upsert(withWorkspace, { onConflict: "name,workspace" });
  if (!first.error) return;

  await supabase.from("tag_definitions").upsert(withoutWorkspace, { onConflict: "name" });
}

async function dispatchCampaignSend(payload: Record<string, unknown>) {
  if (!process.env.INNGEST_EVENT_KEY) {
    throw new Error("INNGEST_EVENT_KEY is not configured");
  }

  const inngest = new Inngest({
    id: "dreamplay-email-3",
    eventKey: process.env.INNGEST_EVENT_KEY,
  });

  return inngest.send(payload as Parameters<Inngest["send"]>[0]);
}

async function handleCampaigns(request: Request, method: string, workspace: Workspace, path: string[]) {
  const supabase = createAdminClient();
  const campaignId = path[1];
  const action = path[2];

  if (method === "GET" && !campaignId) {
    const url = new URL(request.url);
    const pagination = paginationFromUrl(url);
    const [from, to] = rangeFor(pagination);
    const includeHtml = url.searchParams.get("include_html") === "true";
    const fields = includeHtml ? campaignDetailFields : campaignListFields;

    let query = supabase
      .from("campaigns")
      .select(fields, { count: "exact" })
      .eq("workspace", workspace)
      .order("updated_at", { ascending: false })
      .range(from, to);

    const status = url.searchParams.get("status");
    const emailType = url.searchParams.get("email_type");
    const parentTemplateId = url.searchParams.get("parent_template_id");
    const isTemplate = url.searchParams.get("is_template");

    if (status) query = query.eq("status", status);
    if (emailType) query = query.eq("email_type", emailType);
    if (parentTemplateId) query = query.eq("parent_template_id", parentTemplateId);
    if (isTemplate !== null) query = query.eq("is_template", isTemplate === "true");

    const { data, count, error } = await query;
    if (error) return errorResponse(error.message, 500);
    return json(listEnvelope(data, pagination, count));
  }

  if (method === "GET" && campaignId && action === "analytics") {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id,name,total_recipients,total_opens,total_clicks,status,workspace")
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Campaign not found", 404);
    return json({ data });
  }

  if (method === "GET" && campaignId && action === "sent-history") {
    const campaign = await supabase
      .from("campaigns")
      .select("id")
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .maybeSingle();
    if (campaign.error) return errorResponse(campaign.error.message, 500);
    if (!campaign.data) return errorResponse("Campaign not found", 404);

    const url = new URL(request.url);
    const pagination = paginationFromUrl(url);
    const [from, to] = rangeFor(pagination);
    const { data, count, error } = await supabase
      .from("sent_history")
      .select("subscriber_id,sent_at,resend_email_id,subscribers(email,first_name,last_name,tags,workspace)", {
        count: "exact",
      })
      .eq("campaign_id", campaignId)
      .order("sent_at", { ascending: false })
      .range(from, to);

    if (error) return errorResponse(error.message, 500);
    return json(listEnvelope(data, pagination, count));
  }

  if (method === "GET" && campaignId && !action) {
    const { data, error } = await supabase
      .from("campaigns")
      .select(campaignDetailFields)
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Campaign not found", 404);
    return json({ data });
  }

  if (method === "POST" && !campaignId) {
    const body = await readJson(request);
    const parsed = campaignCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const insert = {
      ...parsed.data,
      status: parsed.data.status || "draft",
      workspace,
    };

    const { data, error } = await supabase.from("campaigns").insert(insert).select(campaignDetailFields).single();
    if (error) return errorResponse(error.message, 500);
    return json({ data }, 201);
  }

  if (method === "PATCH" && campaignId && !action) {
    const body = await readJson(request);
    const parsed = campaignPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("campaigns")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .select(campaignDetailFields)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Campaign not found", 404);
    return json({ data });
  }

  if (method === "POST" && campaignId && action === "clone") {
    const body = await readJson(request);
    const parsed = cloneCampaignSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data: original, error: fetchError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .maybeSingle();

    if (fetchError) return errorResponse(fetchError.message, 500);
    if (!original) return errorResponse("Campaign not found", 404);

    const sourceVars = (original.variable_values || {}) as Record<string, unknown>;
    const { subscriber_id: _drop, ...restVars } = sourceVars;
    const overrides = parsed.data.variable_values || {};
    const mergedVars: Record<string, unknown> = { ...restVars, ...overrides };
    if (parsed.data.subscriber_ids?.length) {
      mergedVars.subscriber_ids = parsed.data.subscriber_ids;
    }
    if (parsed.data.target_tag) {
      mergedVars.target_tag = parsed.data.target_tag;
    }

    let name = parsed.data.name;
    if (!name) {
      if (parsed.data.subscriber_ids?.length) {
        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        name = `${original.name} (Bulk Send ${today}, ${parsed.data.subscriber_ids.length} recipients)`;
      } else if (parsed.data.target_tag) {
        name = `${original.name} (Tag: ${parsed.data.target_tag})`;
      } else {
        name = original.name;
      }
    }

    const insert = {
      name,
      status: "draft",
      email_type: original.email_type || "campaign",
      subject_line: original.subject_line,
      html_content: original.html_content,
      workspace,
      variable_values: mergedVars,
      parent_template_id: original.is_template ? original.id : original.parent_template_id || null,
      is_template: parsed.data.is_template ?? false,
      is_starred_template: parsed.data.is_starred_template ?? false,
    };

    const { data, error: insertError } = await supabase
      .from("campaigns")
      .insert(insert)
      .select(campaignDetailFields)
      .single();

    if (insertError) return errorResponse(insertError.message, 500);
    return json({ data }, 201);
  }

  if (method === "POST" && campaignId && action === "send") {
    const body = await readJson(request);
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select("id,name,is_template,variable_values,status")
      .eq("workspace", workspace)
      .eq("id", campaignId)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!campaign) return errorResponse("Campaign not found", 404);
    if (campaign.is_template) return errorResponse("Refusing to send a master template. Create a child campaign first.", 400);

    const variableValues = (campaign.variable_values || {}) as Record<string, unknown>;
    const subscriberIds = variableValues.subscriber_ids;
    const hasSubscriberIds = Array.isArray(subscriberIds) && subscriberIds.length > 0;
    const hasSubscriberId = Boolean(variableValues.subscriber_id);
    const hasTargetTag = Boolean(variableValues.target_tag);

    if (!hasSubscriberId && !hasSubscriberIds && !hasTargetTag) {
      return errorResponse("UNSAFE_SEND_BLOCKED", 400, {
        message: "Set variable_values.subscriber_id, variable_values.subscriber_ids, or variable_values.target_tag before sending.",
      });
    }

    if (hasTargetTag && !parsed.data.confirmTargetTag) {
      return errorResponse("TARGET_TAG_SEND_REQUIRES_CONFIRMATION", 400, {
        message: "target_tag can send to a broad audience. Retry with { confirmTargetTag: true }.",
      });
    }

    if (parsed.data.scheduledAt) {
      const update = await supabase
        .from("campaigns")
        .update({
          scheduled_at: parsed.data.scheduledAt,
          scheduled_status: "pending",
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("workspace", workspace)
        .eq("id", campaignId);
      if (update.error) return errorResponse(update.error.message, 500);

      await dispatchCampaignSend({
        name: "campaign.scheduled-send",
        data: { campaignId, workspace, scheduledAt: parsed.data.scheduledAt },
      });

      return json({ data: { success: true, scheduled: true, scheduledAt: parsed.data.scheduledAt } });
    }

    const update = await supabase
      .from("campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("workspace", workspace)
      .eq("id", campaignId);
    if (update.error) return errorResponse(update.error.message, 500);

    await dispatchCampaignSend({
      name: "campaign.send",
      data: {
        campaignId,
        workspace,
        fromName: parsed.data.fromName,
        fromEmail: parsed.data.fromEmail,
        clickTracking: parsed.data.clickTracking,
        openTracking: parsed.data.openTracking,
        resendClickTracking: parsed.data.resendClickTracking,
        resendOpenTracking: parsed.data.resendOpenTracking,
      },
    });

    return json({ data: { success: true, scheduled: false } });
  }

  return errorResponse("Campaign endpoint not found", 404);
}

async function handleSubscribers(request: Request, method: string, workspace: Workspace, path: string[]) {
  const supabase = createAdminClient();
  const subscriberId = path[1];
  const action = path[2];

  if (method === "GET" && !subscriberId) {
    const url = new URL(request.url);
    const pagination = paginationFromUrl(url);
    const [from, to] = rangeFor(pagination);

    let query = supabase
      .from("subscribers")
      .select(subscriberFields, { count: "exact" })
      .eq("workspace", workspace)
      .order("updated_at", { ascending: false })
      .range(from, to);

    const tag = url.searchParams.get("tag");
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    if (tag) query = query.contains("tags", [tag]);
    if (search) query = query.ilike("email", `%${search}%`);
    if (status) query = query.eq("status", status);

    const { data, count, error } = await query;
    if (error) return errorResponse(error.message, 500);
    return json(listEnvelope(data, pagination, count));
  }

  if (method === "GET" && subscriberId && action === "history") {
    const subscriber = await supabase
      .from("subscribers")
      .select("id")
      .eq("workspace", workspace)
      .eq("id", subscriberId)
      .maybeSingle();
    if (subscriber.error) return errorResponse(subscriber.error.message, 500);
    if (!subscriber.data) return errorResponse("Subscriber not found", 404);

    const [sentRes, eventsRes] = await Promise.all([
      supabase
        .from("sent_history")
        .select("campaign_id,sent_at,resend_email_id,campaigns(name,subject_line,workspace)")
        .eq("subscriber_id", subscriberId)
        .order("sent_at", { ascending: false })
        .limit(100),
      supabase
        .from("subscriber_events")
        .select("event_type,occurred_at,metadata")
        .eq("subscriber_id", subscriberId)
        .order("occurred_at", { ascending: false })
        .limit(100),
    ]);

    if (sentRes.error) return errorResponse(sentRes.error.message, 500);
    if (eventsRes.error) return errorResponse(eventsRes.error.message, 500);
    return json({ data: { sent: sentRes.data || [], events: eventsRes.data || [] } });
  }

  if (method === "GET" && subscriberId && !action) {
    const { data, error } = await supabase
      .from("subscribers")
      .select(subscriberFields)
      .eq("workspace", workspace)
      .eq("id", subscriberId)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Subscriber not found", 404);
    return json({ data });
  }

  if (method === "PATCH" && subscriberId && !action) {
    const body = await readJson(request);
    const parsed = subscriberPatchSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("subscribers")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("workspace", workspace)
      .eq("id", subscriberId)
      .select(subscriberFields)
      .maybeSingle();

    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Subscriber not found", 404);
    return json({ data });
  }

  if (method === "POST" && !subscriberId) {
    const body = await readJson(request);
    const parsed = subscriberUpsertSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const email = normalizeEmail(parsed.data.email);
    const existing = await supabase
      .from("subscribers")
      .select("id,tags")
      .eq("workspace", workspace)
      .eq("email", email)
      .maybeSingle();
    if (existing.error) return errorResponse(existing.error.message, 500);

    const tags = uniqueStrings([...(existing.data?.tags || []), ...(parsed.data.tags || [])]);
    await ensureTagDefinitions(workspace, tags);

    if (existing.data) {
      const { data, error } = await supabase
        .from("subscribers")
        .update({
          ...parsed.data,
          email,
          tags,
          workspace,
          updated_at: new Date().toISOString(),
        })
        .eq("workspace", workspace)
        .eq("id", existing.data.id)
        .select(subscriberFields)
        .single();
      if (error) return errorResponse(error.message, 500);
      return json({ data });
    }

    const { data, error } = await supabase
      .from("subscribers")
      .insert({ ...parsed.data, email, tags, workspace })
      .select(subscriberFields)
      .single();
    if (error) return errorResponse(error.message, 500);
    return json({ data }, 201);
  }

  if (method === "POST" && subscriberId === "bulk-tag") {
    const body = await readJson(request);
    const parsed = bulkTagSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    await ensureTagDefinitions(workspace, parsed.data.tags);

    const results = [];
    for (const emailInput of parsed.data.emails) {
      const email = normalizeEmail(emailInput);
      const existing = await supabase
        .from("subscribers")
        .select("id,tags")
        .eq("workspace", workspace)
        .eq("email", email)
        .maybeSingle();

      if (existing.error) {
        results.push({ email, success: false, error: existing.error.message });
        continue;
      }

      const tags = uniqueStrings([...(existing.data?.tags || []), ...parsed.data.tags]);
      const response = existing.data
        ? await supabase
            .from("subscribers")
            .update({ tags, updated_at: new Date().toISOString() })
            .eq("workspace", workspace)
            .eq("id", existing.data.id)
        : await supabase.from("subscribers").insert({ email, tags, workspace, status: "active" });

      results.push(response.error ? { email, success: false, error: response.error.message } : { email, success: true });
    }

    return json({
      data: {
        succeeded: results.filter((result) => result.success).length,
        total: results.length,
        results,
      },
    });
  }

  return errorResponse("Subscriber endpoint not found", 404);
}

async function handleTags(request: Request, method: string, workspace: Workspace, path: string[]) {
  const supabase = createAdminClient();
  const tagId = path[1];

  if (method === "GET") {
    const { data, error } = await supabase.from("tag_definitions").select("*").eq("workspace", workspace).order("name");
    if (!error) return json({ data: data || [] });

    const fallback = await supabase.from("tag_definitions").select("*").order("name");
    if (fallback.error) return errorResponse(fallback.error.message, 500);
    return json({ data: fallback.data || [], warning: "tag_definitions.workspace was not available; returned global tags" });
  }

  if (method === "POST") {
    const body = await readJson(request);
    const parsed = tagCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase
      .from("tag_definitions")
      .upsert({ ...parsed.data, workspace }, { onConflict: "name,workspace" })
      .select()
      .single();

    if (!error) return json({ data }, 201);

    const fallback = await supabase
      .from("tag_definitions")
      .upsert(parsed.data, { onConflict: "name" })
      .select()
      .single();
    if (fallback.error) return errorResponse(fallback.error.message, 500);
    return json({ data: fallback.data, warning: "tag_definitions.workspace was not available; wrote global tag" }, 201);
  }

  if (method === "DELETE" && tagId) {
    const { data: tag, error } = await supabase.from("tag_definitions").select("id,name").eq("id", tagId).maybeSingle();
    if (error) return errorResponse(error.message, 500);
    if (!tag) return errorResponse("Tag not found", 404);

    const affected = await supabase
      .from("subscribers")
      .select("id,tags")
      .eq("workspace", workspace)
      .contains("tags", [tag.name]);
    if (affected.error) return errorResponse(affected.error.message, 500);

    for (const subscriber of affected.data || []) {
      await supabase
        .from("subscribers")
        .update({ tags: (subscriber.tags || []).filter((value: string) => value !== tag.name) })
        .eq("workspace", workspace)
        .eq("id", subscriber.id);
    }

    const deleted = await supabase.from("tag_definitions").delete().eq("id", tagId);
    if (deleted.error) return errorResponse(deleted.error.message, 500);
    return json({ data: { success: true, removedFrom: affected.data?.length || 0 } });
  }

  return errorResponse("Tags endpoint not found", 404);
}

async function handleChains(request: Request, method: string, workspace: Workspace, path: string[]) {
  const supabase = createAdminClient();
  const chainId = path[1];
  const action = path[2];

  if (method === "GET" && !chainId) {
    const url = new URL(request.url);
    const pagination = paginationFromUrl(url);
    const [from, to] = rangeFor(pagination);
    const { data, count, error } = await supabase
      .from("email_chains")
      .select("*", { count: "exact" })
      .eq("workspace", workspace)
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (error) return errorResponse(error.message, 500);
    return json(listEnvelope(data, pagination, count));
  }

  if (method === "GET" && chainId && action === "analytics") {
    const chain = await supabase.from("email_chains").select("id").eq("workspace", workspace).eq("id", chainId).maybeSingle();
    if (chain.error) return errorResponse(chain.error.message, 500);
    if (!chain.data) return errorResponse("Chain not found", 404);

    const { data, error } = await supabase.from("chain_processes").select("id,status").eq("chain_id", chainId);
    if (error) return errorResponse(error.message, 500);
    return json({
      data: {
        chainId,
        enrolled: data?.length || 0,
        completed: data?.filter((process) => process.status === "completed").length || 0,
      },
    });
  }

  if (method === "GET" && chainId && !action) {
    const { data, error } = await supabase.from("email_chains").select("*").eq("workspace", workspace).eq("id", chainId).maybeSingle();
    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Chain not found", 404);
    return json({ data });
  }

  if (method === "POST" && !chainId) {
    const body = await readJson(request);
    const parsed = chainCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase.from("email_chains").insert({ ...parsed.data, workspace }).select("*").single();
    if (error) return errorResponse(error.message, 500);
    return json({ data }, 201);
  }

  if (method === "POST" && chainId && (action === "activate" || action === "deactivate")) {
    const status = action === "activate" ? "active" : "draft";
    const { data, error } = await supabase
      .from("email_chains")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("workspace", workspace)
      .eq("id", chainId)
      .select("*")
      .maybeSingle();
    if (error) return errorResponse(error.message, 500);
    if (!data) return errorResponse("Chain not found", 404);
    return json({ data });
  }

  return errorResponse("Chain endpoint not found", 404);
}

async function handleMergeTags(method: string) {
  if (method !== "GET") return errorResponse("Merge-tags endpoint not found", 404);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("merge_tags").select("*").order("created_at", { ascending: true });
  if (error) return errorResponse(error.message, 500);
  return json({ data: data || [] });
}

async function handleTriggers(request: Request, method: string, workspace: Workspace) {
  const supabase = createAdminClient();

  if (method === "GET") {
    const { data, error } = await supabase.from("email_triggers").select("*").eq("workspace", workspace).order("created_at");
    if (error) return errorResponse(error.message, 500);
    return json({ data: data || [] });
  }

  if (method === "POST") {
    const body = await readJson(request);
    const parsed = triggerCreateSchema.safeParse(body);
    if (!parsed.success) return zodErrorResponse(parsed.error);

    const { data, error } = await supabase.from("email_triggers").insert({ ...parsed.data, workspace }).select("*").single();
    if (error) return errorResponse(error.message, 500);
    return json({ data }, 201);
  }

  return errorResponse("Triggers endpoint not found", 404);
}

async function handleCopilot(request: Request, workspace: Workspace) {
  const body = await readJson(request);
  const parsed = copilotSchema.safeParse(body);
  if (!parsed.success) return zodErrorResponse(parsed.error);

  try {
    const data = await generateCopilotEmail({ workspace, ...parsed.data });
    return json({ data });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Copilot failed", 500);
  }
}

export async function handleHermesRequest(request: Request, context: HermesRouteContext): Promise<NextResponse> {
  try {
    const authError = requireHermesAuth(request);
    if (authError) return authError;

    const params = await context.params;
    const workspaceResult = workspaceSchema.safeParse(params.workspace);
    if (!workspaceResult.success) {
      return errorResponse("Invalid workspace", 400, { allowed: workspaceSchema.options });
    }

    const path = params.path || [];
    const resource = path[0] || "";
    const method = request.method.toUpperCase();
    const workspace = workspaceResult.data;

    switch (resource) {
      case "campaigns":
        return await handleCampaigns(request, method, workspace, path);
      case "subscribers":
        return await handleSubscribers(request, method, workspace, path);
      case "tags":
        return await handleTags(request, method, workspace, path);
      case "chains":
        return await handleChains(request, method, workspace, path);
      case "merge-tags":
        return await handleMergeTags(method);
      case "triggers":
        return await handleTriggers(request, method, workspace);
      case "copilot":
        if (method !== "POST") return errorResponse("Copilot only accepts POST", 405);
        return await handleCopilot(request, workspace);
      default:
        return routeNotFound(resource);
    }
  } catch (error) {
    console.error("[hermes] unhandled error:", error);
    return errorResponse(error instanceof Error ? error.message : "Unexpected server error", 500);
  }
}
