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
