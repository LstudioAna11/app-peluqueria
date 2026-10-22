/*
# Add professional reference to appointments

1. Purpose
Adds an optional professional (stylist) reference to each appointment so the
booking flow can let clients pick a preferred professional, and the intranet
plus email/WhatsApp confirmations can display who will attend them.

2. Changes
- `studio_appointments.professional_id` (text, nullable): the employee UUID from
  `studio_settings.configuration.employees[].id`. NULL means "sin preferencia"
  or the appointment predates the feature. Existing appointments keep NULL.
- `studio_appointments.professional_name` (text, nullable): the display name
  captured at booking time, so confirmations and the intranet can show it even
  if the employee is later renamed or removed from settings.

3. Security
No new tables. No policy changes. The column is read/written by the service
role (edge function) which already has full access to studio_appointments.
The anon role does not touch this table directly.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studio_appointments' AND column_name = 'professional_id'
  ) THEN
    ALTER TABLE public.studio_appointments ADD COLUMN professional_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'studio_appointments' AND column_name = 'professional_name'
  ) THEN
    ALTER TABLE public.studio_appointments ADD COLUMN professional_name text;
  END IF;
END $$;
