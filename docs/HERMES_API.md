# Hermes API

Base URL:

```text
/api/hermes/{workspace}/{resource}
```

Every request needs:

```http
Authorization: Bearer <HERMES_API_KEY>
```

All list endpoints support:

| Param | Default | Notes |
| --- | --- | --- |
| `limit` | `25` | Max `100` |
| `offset` | `0` | Zero-based row offset |

Responses use an envelope:

```json
{
  "data": [],
  "pagination": { "limit": 25, "offset": 0, "count": 0 }
}
```

## Resources

- `GET /campaigns`
- `GET /campaigns/{id}`
- `POST /campaigns`
- `PATCH /campaigns/{id}`
- `POST /campaigns/{id}/clone`
- `POST /campaigns/{id}/send`
- `GET /campaigns/{id}/analytics`
- `GET /campaigns/{id}/sent-history`
- `GET /subscribers`
- `GET /subscribers/{id}`
- `GET /subscribers/{id}/history`
- `POST /subscribers`
- `PATCH /subscribers/{id}`
- `POST /subscribers/bulk-tag`
- `GET /tags`
- `POST /tags`
- `DELETE /tags/{id}`
- `GET /chains`
- `GET /chains/{id}`
- `POST /chains`
- `POST /chains/{id}/activate`
- `POST /chains/{id}/deactivate`
- `GET /merge-tags`
- `GET /triggers`
- `POST /triggers`
- `POST /copilot`

## Campaign Fields

When creating a campaign with `POST /campaigns`, agents should be aware of these fields. Required: `name`. The rest are optional but most have specific allowed values.

### `email_type`

Allowed values: `"campaign"` or `"automated"`. Defaults to `"campaign"` if omitted.

- `"campaign"`: a regular broadcast or newsletter, manually composed and sent (or scheduled). **This is what the Engine UI's Drafts/Scheduled/Completed tabs filter on**, so a campaign with any other value will not appear in those tabs.
- `"automated"`: a campaign sent by a chain or trigger as part of an automated flow. Use this only when the campaign is wired to fire from a chain step or trigger, not from a manual send.

Do not invent values like `"broadcast"`, `"newsletter"`, or `"transactional"`. Validation will reject them.

### `status`

Allowed values: `"draft"`, `"scheduled"`, `"sending"`, `"completed"`, `"deleted"`. New campaigns should be created with `status: "draft"` (or omitted, since draft is the conventional starting state). The send dispatcher transitions this field; agents should not set `"sending"` or `"completed"` directly.

### `is_template` and `parent_template_id`

- `is_template: true` marks the row as a master template that other campaigns can be cloned from. Templates appear in the Engine UI's Master Templates tab and are excluded from Drafts.
- `parent_template_id` points a regular campaign at the master template it was cloned from. Optional; only set this if the campaign was actually derived from a template.

### `variable_values`

A JSON object of merge-tag values for the campaign. Keys correspond to `{{tokens}}` in `html_content`. Common keys observed in existing templates: `logo_src`, `hero_img`, `hero_link_url`, `secondary_img`, `unsubscribe_url`. The `{{first_name}}` token is populated per-recipient at send time, not from this object.

## Cloning Master Templates

Hermes refuses to send a campaign with `is_template: true` (master templates are not sendable directly). To send a master template, clone it into a child campaign first via `POST /campaigns/{id}/clone`, then send the child.

The clone endpoint accepts an optional JSON body. All fields are optional:

```json
{
  "name": "string (overrides auto-generated name)",
  "subscriber_ids": ["uuid", "uuid"],
  "target_tag": "string",
  "variable_values": { "...": "merged into the child's variable_values" },
  "is_template": false,
  "is_starred_template": false
}
```

What the child inherits from the master:

- `subject_line`, `html_content`, `workspace`, `email_type` (copied)
- `variable_values` (copied, with `subscriber_id` stripped)
- `parent_template_id` set to the master's id

Then the body's overrides are applied:

- If `subscriber_ids` is provided, it's set on `variable_values.subscriber_ids` and the child's `name` becomes `"{master name} (Bulk Send {date}, N recipients)"` unless `name` was explicitly provided.
- If `target_tag` is provided, it's set on `variable_values.target_tag` and the name becomes `"{master name} (Tag: {tag})"` unless `name` was explicitly provided.
- Anything in `variable_values` is merged on top, overriding inherited values.
- The child is always created with `status: "draft"`, `is_template: false` by default. If you pass `is_template: true`, you're cloning the master into another master, not a sendable child.

The agent flow for sending a master template to a tagged audience:

1. `POST /campaigns/{master_id}/clone` with `{"target_tag": "Test Account"}`. Receive `child_id` in the response.
2. `POST /campaigns/{child_id}/send` with `{"confirmTargetTag": true}`.

The agent flow for sending to a specific subscriber list:

1. `POST /campaigns/{master_id}/clone` with `{"subscriber_ids": [...]}`.
2. `POST /campaigns/{child_id}/send`.

## Safe Sending

Hermes refuses to send a campaign unless `variable_values` has one of:

- `subscriber_id`
- non-empty `subscriber_ids`
- `target_tag`

`target_tag` sends are additionally blocked unless the request body includes:

```json
{ "confirmTargetTag": true }
```

Agent workflows should prefer `subscriber_ids`.
