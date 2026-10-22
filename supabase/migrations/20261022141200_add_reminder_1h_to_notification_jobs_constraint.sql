/*
# Add reminder_1h kind to notification_jobs check constraint

1. Modified Tables
- `studio_notification_jobs`: the `kind` CHECK constraint now also allows `'reminder_1h'`.
- No data is changed; existing rows are unaffected.

2. Security
- No RLS or policy changes.
- No grant changes.

3. Notes
- The WhatsApp reminder was changed from 2 hours to 1 hour before the appointment.
- The new kind `reminder_1h` must be allowed by the check constraint so the edge
  function can insert jobs with that kind.
*/

ALTER TABLE studio_notification_jobs
  DROP CONSTRAINT IF EXISTS studio_notification_jobs_kind_check;

ALTER TABLE studio_notification_jobs
  ADD CONSTRAINT studio_notification_jobs_kind_check
  CHECK (kind = ANY (ARRAY['confirmation'::text, 'update'::text, 'reminder_24h'::text, 'reminder_2h'::text, 'reminder_1h'::text]));
