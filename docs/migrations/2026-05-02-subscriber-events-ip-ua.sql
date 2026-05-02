-- Migration: capture IP + User-Agent on click events so we can filter
-- email security scanners (Microsoft ATP Safe Links, Mimecast, Proofpoint,
-- Slack/Discord/iMessage link unfurlers, etc.) at read time.
--
-- Idempotent: safe to re-run. Both columns nullable, no backfill needed
-- for the existing 29 click rows from the May 1 batch (they stay NULL,
-- which the read-time filter treats as "unknown, include").
--
-- Run this in the Supabase SQL editor for the email project
-- (quyqwdjygzalqqmrgkfk). The dp-email-2 click endpoint and dp-email-3
-- events endpoint are written to tolerate this column not yet existing,
-- so deploy ordering is flexible, but until you run this, the new
-- columns will just be empty.

ALTER TABLE subscriber_events
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;
