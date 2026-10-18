/*
# Phase 1: automatic EMAIL notifications for appointments

1. Purpose
Server-side email notifications for L'Studio Ana, connected to the client portal
and the 360Studio intranet. Emails are scheduled in the database and dispatched
by a persistent scheduled job, so they work even when the app is closed.

2. New tables
- `studio_email_outbox`
  - `id` (uuid, primary key): message identity.
  - `appointment_id` (uuid, nullable FK to studio_appointments): appointment this
    email belongs to; kept on delete for audit history.
  - `kind` (text): 'confirmation' | 'request_received' | 'update' | 'cancellation'
    | 'reminder_48h' | 'reminder_24h'.
  - `to_email` (text): recipient address.
  - `subject` (text): email subject line.
  - `body_html` (text): rendered HTML body (mobile-friendly, studio branding).
  - `status` (text): 'scheduled' | 'sending' | 'sent' | 'failed' | 'skipped'.
  - `scheduled_at` (timestamptz): earliest moment the message may be sent.
  - `sent_at` (timestamptz): provider-confirmed send time.
  - `provider` (text): email provider used ('resend' when configured).
  - `provider_message_id` (text): id returned by the provider.
  - `last_error` (text): last dispatch error, for diagnosis in 360Studio.
  - `attempts` (int): dispatch attempts made.
  - `idempotency_key` (text, unique): prevents duplicate emails on retries.
  - `created_at` (timestamptz).

3. RLS and security
- RLS is ENABLED on `studio_email_outbox`.
- No policies are granted to anon/authenticated: only server code (edge functions
  with the service role) reads or writes it. The intranet consults email status
  through the authenticated `studio-api` server action.

4. Notes
- Data-safe: creates only new objects; nothing existing is changed or dropped.
- Timezone Europe/Madrid (DST aware) is handled by computing send times from the
  appointment start instant, so summer/winter clock changes need no special code.
*/

CREATE TABLE IF NOT EXISTS public.studio_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.studio_appointments(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('confirmation','request_received','update','cancellation','reminder_48h','reminder_24h')),
  to_email text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sending','sent','failed','skipped')),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider text,
  provider_message_id text,
  last_error text,
  attempts int NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_email_outbox ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS studio_email_outbox_dispatch_idx
  ON public.studio_email_outbox (status, scheduled_at);

CREATE INDEX IF NOT EXISTS studio_email_outbox_appointment_idx
  ON public.studio_email_outbox (appointment_id);