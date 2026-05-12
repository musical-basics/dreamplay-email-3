-- 2026-05-12: defense-in-depth constraint against double-sends.
--
-- After the 2026-05-12 Gmail double-send incident
-- (docs/INCIDENT-2026-05-12-gmail-double-send.md), the send-stream loop
-- was made idempotent at the application layer. This constraint is the
-- belt-and-suspenders layer below it: even if every application check
-- fails, Postgres rejects the duplicate INSERT with a unique violation
-- and the second send never goes out.
--
-- Run AFTER _work/dedupe-sent-history.ts has cleared existing duplicates
-- (293 rows as of 2026-05-12T05:00Z). The constraint creation will fail
-- if any duplicate (campaign_id, subscriber_id) pairs still exist.
--
-- Apply this in the Supabase SQL editor for the email project
-- (quyqwdjygzalqqmrgkfk).

ALTER TABLE sent_history
  ADD CONSTRAINT sent_history_campaign_subscriber_unique
  UNIQUE (campaign_id, subscriber_id);

-- Verification queries (run after the ALTER):
--   SELECT conname, contype FROM pg_constraint
--     WHERE conrelid = 'sent_history'::regclass;
--   -- Expect to see sent_history_campaign_subscriber_unique (contype='u')
--
--   SELECT campaign_id, subscriber_id, COUNT(*)
--     FROM sent_history
--     GROUP BY campaign_id, subscriber_id
--     HAVING COUNT(*) > 1
--     LIMIT 5;
--   -- Expect zero rows.

-- After this constraint is in place, send-stream's per-recipient
-- INSERT at app/api/send-stream/route.ts will raise an error if a
-- retry tries to write a duplicate row. The error is caught and logged
-- by the per-row insert's error branch; the send loop continues. The
-- end result is identical to the application-layer idempotency check
-- (no duplicate Resend call, no duplicate row).
