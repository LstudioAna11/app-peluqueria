/*
# WhatsApp confirmation outbox (phase 1: immediate booking confirmations)

1. New Tables
- `studio_whatsapp_outbox`
  - `id` (uuid, primary key, default gen_random_uuid())
  - `idempotency_key` (text, unique, not null) — e.g. `confirmation:<appointment-uuid>:<startsAt>`, prevents duplicate sends on retries.
  - `appointment_id` (uuid, nullable) — references `studio_appointments(id)` on delete set null.
  - `kind` (text, not null) — `confirmation`, `request_received`, `update`, `cancellation`.
  - `to_phone` (text, not null) — client phone in E.164 format (e.g. `+34600123456`).
  - `template_name` (text, not null) — approved WhatsApp Business template name to use.
  - `body_text` (text, not null) — rendered message text (used for free-form/service messages and for admin display).
  - `status` (text, not null, default 'scheduled') — `scheduled` | `sending` | `sent` | `delivered` | `read` | `failed` | `skipped`.
  - `scheduled_at` (timestamptz, not null, default now()) — earliest moment the worker may send.
  - `sent_at` (timestamptz, nullable) — provider-confirmed acceptance time.
  - `delivered_at` (timestamptz, nullable) — from Meta delivery webhook.
  - `read_at` (timestamptz, nullable) — from Meta read webhook.
  - `provider` (text, nullable) — e.g. `meta_cloud_api`.
  - `provider_message_id` (text, nullable) — Meta wamid, used for status webhooks.
  - `last_error` (text, nullable).
  - `attempts` (integer, not null, default 0).
  - `created_at` (timestamptz, not null, default now()).
- `studio_whatsapp_config`
  - `id` (boolean primary key, only row `true`)
  - `provider` (text, nullable) — e.g. `meta_cloud_api`.
  - `phone_number_id` (text, nullable) — WhatsApp Business phone number id.
  - `access_token` (text, nullable) — permanent system-user token (secret).
  - `template_name` (text, nullable) — approved template for confirmations.
  - `studio_phone` (text, nullable) — studio WhatsApp number in E.164, for display.
  - `verify_token` (text, nullable) — for Meta webhook subscription verification.
  - `worker_secret` (text, nullable) — shared secret protecting worker calls.
  - `portal_url` (text, nullable) — portal link included in the message.
  - `updated_at` (timestamptz, default now()).
2. Security
- RLS enabled on both tables; no anon/authenticated policies: only the service
  role (edge functions) may read/write. This matches the email outbox tables.
3. Notes
- Push notifications and email notifications keep working independently; this
  table only feeds the WhatsApp worker.
*/

CREATE TABLE IF NOT EXISTS studio_whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  appointment_id uuid REFERENCES studio_appointments(id) ON DELETE SET NULL,
  kind text NOT NULL,
  to_phone text NOT NULL,
  template_name text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  provider text,
  provider_message_id text,
  last_error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS studio_whatsapp_outbox_due_idx
  ON studio_whatsapp_outbox (status, scheduled_at);

CREATE TABLE IF NOT EXISTS studio_whatsapp_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  provider text,
  phone_number_id text,
  access_token text,
  template_name text,
  studio_phone text,
  verify_token text,
  worker_secret text,
  portal_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studio_whatsapp_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_whatsapp_config ENABLE ROW LEVEL SECURITY;
