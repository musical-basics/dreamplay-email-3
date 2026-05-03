import { z } from "zod";

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue)])
);

export const jsonObjectSchema = z.record(jsonValue);

export const campaignCreateSchema = z.object({
  name: z.string().min(1),
  subject_line: z.string().optional().nullable(),
  html_content: z.string().optional().nullable(),
  variable_values: jsonObjectSchema.optional(),
  status: z.enum(["draft", "scheduled", "sending", "completed", "deleted"]).optional(),
  email_type: z.enum(["campaign", "automated"]).optional().default("campaign"),
  is_template: z.boolean().optional(),
  is_ready: z.boolean().optional(),
  is_starred_template: z.boolean().optional(),
  parent_template_id: z.string().uuid().optional().nullable(),
  category: z.string().optional().nullable(),
  template_folder_id: z.string().uuid().optional().nullable(),
  sent_from_email: z.string().email().optional().nullable(),
});

export const campaignPatchSchema = campaignCreateSchema.partial().omit({ name: true }).extend({
  name: z.string().min(1).optional(),
});

export const bulkCancelSchema = z.object({
  campaign_ids: z.array(z.string().uuid()).min(1).max(100),
});

export const cloneCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  subscriber_ids: z.array(z.string().uuid()).optional(),
  target_tag: z.string().min(1).optional(),
  variable_values: jsonObjectSchema.optional(),
  is_template: z.boolean().optional(),
  is_starred_template: z.boolean().optional(),
});

export const sendSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  confirmTargetTag: z.boolean().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  clickTracking: z.boolean().optional(),
  clickTrackingMode: z.enum(["append", "redirect"]).optional(),
  openTracking: z.boolean().optional(),
  resendClickTracking: z.boolean().optional(),
  resendOpenTracking: z.boolean().optional(),
});

export const subscriberUpsertSchema = z.object({
  email: z.string().email(),
  first_name: z.string().optional().default(""),
  last_name: z.string().optional().default(""),
  status: z.enum(["active", "unsubscribed", "bounced", "deleted"]).optional(),
  tags: z.array(z.string().min(1)).optional().default([]),
  smart_tags: jsonObjectSchema.optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  phone_code: z.string().optional(),
  phone_number: z.string().optional(),
  shipping_address1: z.string().optional(),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_zip: z.string().optional(),
  shipping_province: z.string().optional(),
  shopify_customer_id: z.string().optional(),
  klaviyo_profile_id: z.string().optional(),
});

export const subscriberPatchSchema = subscriberUpsertSchema.partial().omit({
  email: true,
  tags: true,
});

export const bulkTagSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(500),
  tags: z.array(z.string().min(1)).min(1).max(50),
});

export const bulkUntagSchema = bulkTagSchema;

export const tagCreateSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1).optional().default("#6b7280"),
});

export const chainCreateSchema = z.object({
  name: z.string().min(1),
  status: z.string().optional().default("draft"),
  steps: z.array(jsonObjectSchema).optional().default([]),
  branches: z.array(jsonObjectSchema).optional().default([]),
  subscriber_id: z.string().uuid().optional().nullable(),
  is_snapshot: z.boolean().optional(),
});

export const triggerCreateSchema = z.object({
  name: z.string().min(1).optional(),
  trigger_type: z.string().min(1).default("subscriber_tag"),
  trigger_value: z.string().min(1),
  chain_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  metadata: jsonObjectSchema.optional(),
});

export const rotationCreateSchema = z.object({
  name: z.string().min(1),
  campaign_ids: z.array(z.string().uuid()).min(1),
});

export const rotationPatchSchema = z.object({
  name: z.string().min(1).optional(),
  campaign_ids: z.array(z.string().uuid()).min(1).optional(),
  cursor_position: z.number().int().min(0).optional(),
});

export const rotationSendSchema = z.object({
  subscriberIds: z.array(z.string().uuid()).min(1),
  scheduledAt: z.string().datetime().optional(),
  fromName: z.string().optional(),
  fromEmail: z.string().email().optional(),
  clickTracking: z.boolean().optional(),
  clickTrackingMode: z.enum(["append", "redirect"]).optional(),
  openTracking: z.boolean().optional(),
  resendClickTracking: z.boolean().optional(),
  resendOpenTracking: z.boolean().optional(),
});

export const copilotSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]).default("user"),
        content: z.string().default(""),
      })
    )
    .default([]),
  currentHtml: z.string().optional().default(""),
  model: z.string().optional().default("claude-sonnet-4-6"),
});
