# Asset Loading

How images, links, and merge tags get into a campaign HTML, what an agent can do to load them, and how they get filled in at send time.

## The big idea

Campaign HTML uses `{{mustache_variables}}` instead of hardcoded URLs and copy. Every variable is filled at one of two moments:

1. **Send time, per-recipient** — subscriber-owned values (`{{first_name}}`, `{{email}}`, `{{location_city}}`, etc.) and dynamic values (`{{unsubscribe_url}}`, `{{discount_code}}`) get resolved against the recipient's row.
2. **Send time, globally** — everything else (`{{hero_img}}`, `{{logo_src}}`, `{{hero_link_url}}`, etc.) comes from the campaign's `variable_values` JSON column. Same value for every recipient.

This split lives in `src/lib/variable-rules.ts` (`STANDARD_TAGS` enumerates the subscriber-owned ones) and is enforced by `src/lib/render-template.ts` + `src/lib/merge-tags.ts` in the send pipeline.

## Variable naming conventions

Names matter. They control how the editor renders the input, how images are paired with their links, and whether the template is treated as agent-readable.

| Pattern | Treated as | Example |
|---|---|---|
| ends in `_src`, `_img`, `_bg`, `_logo`, `_icon` | Image (asset picker) | `hero_img`, `logo_src`, `bg_src` |
| contains `image` or `url` (with caveats below) | Image | `product_image` |
| ends in `_link_url` or contains `link_url` | Link (URL input) | `hero_link_url`, `product_link_url` |
| ends in `_fit` | object-fit dropdown | `hero_img_fit` |
| contains `text` or `paragraph` | Multi-line textarea | `body_text`, `paragraph_one` |
| name is in `STANDARD_TAGS` | Subscriber field, never in editor | `first_name`, `email`, `unsubscribe_url` |

`EXCLUDED_URL_VARS` overrides the "contains url" rule for known link-only variables: `unsubscribe_url`, `privacy_url`, `contact_url`, `about_url`, `homepage_url`, `shipping_url`, `main_cta_url`, `crowdfunding_cta_url`. These render as plain text inputs even though they contain "url".

## Pairing image and link

If an image variable and a link variable share the same prefix, the editor renders them as one paired card.

```
hero_img + hero_link_url       → paired
hero_img + hero_img_fit        → paired (fit dropdown inside the card)
product_src + product_link_url → paired
```

Always wrap an image in its link in the HTML so clicks go somewhere:

```html
<a href="{{hero_link_url}}">
  <img src="{{hero_img}}" alt="..." />
</a>
```

## Asset library

Images live in two places:

1. **Supabase storage bucket `email-assets`** — actual files, public-readable.
2. **Supabase table `media_assets`** — metadata row pointing at the storage object.

Every asset that should appear in the editor's picker needs both. The bucket alone isn't indexed; the picker queries `media_assets`.

Columns on `media_assets` that matter for agents:

| Column | What it means |
|---|---|
| `filename` | Display name in the picker |
| `public_url` | The actual URL to use in `variable_values` |
| `folder_path` | Optional folder, e.g. `Logos`, `Performance Photos` |
| `is_starred` | Pinned to top of the picker, included in "Starred only" filter |
| `is_deleted` | Soft-delete flag. Soft-deleted rows hide from the picker without breaking past sends |
| `asset_type` | Currently always `image` |
| `description` | Short blurb shown in the picker, also useful for agents to identify the right asset |
| `storage_hash` | SHA-256 of the file bytes, used for deduplication |

## Reading assets via the API

```
GET /api/editor-assets?search=<text>&folder=<name>&starred=true&limit=60
```

Returns `media_assets` rows where `is_deleted = false` and `asset_type = "image"`. No bearer required — the route runs server-side with the env-var Supabase service key. Used by the `/editor` UI's asset picker modal.

Response shape:

```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "Lionel Yu Horizontal Logo Dark Mode.jpg",
      "asset_type": "image",
      "public_url": "https://quyqwdjygzalqqmrgkfk.supabase.co/storage/v1/object/public/email-assets/<sha>.jpg",
      "folder_path": "Logos",
      "is_starred": true,
      "created_at": "..."
    }
  ]
}
```

## Uploading a new asset (for agents)

There is no Agent API endpoint for uploads yet. To add a new asset, do these three steps in order. The Supabase service key is required.

1. **Upload bytes to storage.** SHA-256 the file content, use that as the storage path.

   ```
   POST  /storage/v1/object/email-assets/<sha256>.<ext>
   apikey:        <SUPABASE_SERVICE_KEY>
   Authorization: Bearer <SUPABASE_SERVICE_KEY>
   Content-Type:  image/jpeg | image/png | ...
   x-upsert:      true
   body:          <raw bytes>
   ```

2. **Insert a `media_assets` row.** Without this, the picker will not see the file.

   ```
   POST /rest/v1/media_assets
   {
     "filename":     "Human-readable Name.jpg",
     "asset_type":   "image",
     "public_url":   "https://<project>.supabase.co/storage/v1/object/public/email-assets/<sha256>.<ext>",
     "folder_path":  "Logos",
     "is_starred":   false,
     "is_deleted":   false,
     "size":         <byte count>,
     "storage_hash": "<sha256>",
     "description":  "What this image is, for both humans and AI"
   }
   ```

3. **Reference it in a campaign's `variable_values`.** Use the `public_url` from step 2 as the value for the relevant `{{var_name}}`.

## Setting variable values on a campaign

Three ways an agent can fill `variable_values`:

```
PATCH /api/agent/<workspace>/campaigns/<id>
{ "variable_values": { "logo_src": "...", "hero_img": "...", "hero_link_url": "..." } }
```

This **replaces** the entire `variable_values` object. To preserve existing keys, read them first and spread.

If the campaign is a master template, prefer `/clone`:

```
POST /api/agent/<workspace>/campaigns/<master>/clone
{ "variable_values": { "logo_src": "..." }, "subscriber_ids": [...] }
```

Clone copies the master's `variable_values` and merges the body's overrides on top. The child gets `parent_template_id` linking back to the master.

For one-off transactional sends to a single subscriber, set `subscriber_id` (singular) inside `variable_values` and the send-stream targets only that one row.

## What happens at send time

When `POST /campaigns/<id>/send` fires, the pipeline:

1. Fetches the campaign row.
2. If `is_template = true`, auto-clones into a child with `parent_template_id` pointing back. The child is what actually gets sent and tracked.
3. Runs `renderTemplate(html, variable_values)` to substitute global variables (`{{logo_src}}` → URL, `{{hero_link_url}}` → URL, etc.). Subscriber-owned vars in `STANDARD_TAGS` are skipped at this step.
4. Calls `injectPreheader(html, variable_values.preview_text)` to add the hidden inbox-preview span.
5. Runs `proxyEmailImages(html)` over every external `<img src="...">` and CSS `url(...)` reference. Images > 150KB get Sharp-resized to width 1200 and re-encoded as JPEG q82. The original URL is replaced with a permanent `email-images/optimized/<hash>.jpg` or `email-images/hashed/<hash>.<ext>` URL. Repeat sends of the same image hit the cache.
6. Per recipient, runs `applyAllMergeTagsWithLog(html, subscriber, dynamicVars)` to fill `{{first_name}}`, `{{email}}`, `{{unsubscribe_url}}`, `{{discount_code}}`, etc. with the subscriber's data and the dynamic per-send values.
7. Rewrites every `href` through `${TRACKING_BASE_URL}/api/track/click?...` and injects an open pixel `${TRACKING_BASE_URL}/api/track/open?...` (unless tracking is disabled by the caller).
8. Sends via Resend with `from = ${variable_values.from_name} <${variable_values.from_email}>`, falling back to whatever the caller passed in `fromName` / `fromEmail`.
9. Inserts a row into `sent_history` linking the child campaign id to the subscriber id.

If any required `variable_values` key is missing, that mustache variable renders as the literal `{{key}}` in the recipient's inbox. Pre-flight by loading the campaign in `/editor` and looking for unfilled variables in the structured Variables form.

## Master template best practices

A master template (`is_template = true`) acts as the source of truth. Keep these in `variable_values`:

- All image and link variables (logo, hero, secondary, CTA URLs)
- `from_name`, `from_email`
- `preview_text`

Do **not** keep these in `variable_values` on a master:

- `subscriber_id` or `subscriber_ids` (those go on each child clone)
- `target_tag` (also per-clone)
- Anything per-recipient (handled by merge tags)

When you need to send, clone the master to a child with `subscriber_ids` set, then send the child. The Agent API send endpoint and the send-stream auto-clone path both handle this, but explicit clone-then-send gives the agent the child id and full control.

## Common pitfalls

- **Image renders but click does nothing.** The `<img>` isn't wrapped in an `<a>`. Wrap it: `<a href="{{hero_link_url}}"><img src="{{hero_img}}" /></a>`.
- **Image shows as broken in the inbox.** The `public_url` is wrong, or the storage object was deleted, or the bucket is private. Verify by opening the URL in a browser.
- **`{{first_name}}` shows as literal text.** The subscriber row has no `first_name`. Falls back to the merge_tags table default (`"Musical Family"` for musicalbasics) if registered. Double-check via `GET /rest/v1/merge_tags?tag=eq.first_name`.
- **`{{my_custom_var}}` shows as literal text.** The variable wasn't in `variable_values` and isn't in the merge_tags table. Either set it on the campaign or register it as a global merge tag.
- **Asset doesn't appear in the picker after upload.** Forgot step 2 — the `media_assets` row insert. Storage bucket alone isn't indexed.
- **`{{unsubscribe_url}}` renders as literal `{{unsubscribe_url}}`.** Confirm the send pipeline is the dp-email-3 one (it sets dynamicVars.unsubscribe_url) and that the variable name isn't typo'd. Aliases `unsubscribe_link` and `unsubscribe_link_url` also resolve.
