/*
# Push notifications: subscriptions, delivery log, and appointment triggers

1. New Tables
- `studio_push_subscriptions`: one row per device that activates notifications.
  - `id` (uuid, primary key)
  - `client_id` (uuid, nullable, references studio_clients) — owner of the device when signed in
  - `endpoint` (text, unique, not null) — push service URL identifying the subscription
  - `p256dh` (text, not null) and `auth` (text, not null) — subscription keys
  - `user_agent` (text) — device description for the intranet log
  - `created_at`, `updated_at` (timestamps)
- `studio_push_outbox`: delivery record per appointment + notification kind.
  - `id` (uuid, primary key)
  - `appointment_id` (uuid, references studio_appointments)
  - `subscription_id` (uuid, references studio_push_subscriptions, nullable)
  - `kind` (text): confirmation | pending_approval | pending_deposit
  - `status` (text): scheduled | sending | accepted | delivered | failed | expired
  - `provider` (text), `provider_message_id` (text, null)
  - `delivered_at` (timestamptz, null) — only set with provider evidence
  - `last_error` (text, null), `attempts` (int, default 0)
  - `idempotency_key` (text, unique) — appointment+kind prevents duplicate sends
  - `created_at`, `updated_at`

2. Security
- RLS enabled on both tables, no public policies: only the service role
  (edge functions) reads/writes them. The browser never touches these tables
  directly; subscriptions are saved through the authenticated API action.

3. Important notes
- A subscription without client_id (activated before signing in) is later
  claimed by the signed-in user when they log in.
- `delivered_at` is only written when the provider confirms delivery (e.g.
  FCM reports it); otherwise we only record that the send was accepted.
*/

CREATE TABLE IF NOT EXISTS studio_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.studio_clients(id) ON DELETE SET NULL,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS studio_push_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.studio_appointments(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.studio_push_subscriptions(id) ON DELETE SET NULL,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  provider text,
  provider_message_id text,
  delivered_at timestamptz,
  last_error text,
  attempts int NOT NULL DEFAULT 0,
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_appt ON studio_push_outbox(appointment_id);

ALTER TABLE studio_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_push_outbox ENABLE ROW LEVEL SECURITY;
