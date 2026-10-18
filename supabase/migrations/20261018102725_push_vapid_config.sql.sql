/*
# Push notification server configuration (VAPID keys)

1. New Tables
- `studio_push_config`: single row holding the VAPID keys used to sign Web
  Push messages.
  - `id` (boolean, primary key, always true)
  - `public_key` (text) — VAPID public key, also needed by the browser to subscribe
  - `private_key` (text) — VAPID private key, never leaves the server
  - `subject` (text) — contact URI (mailto:) for the push service
  - `updated_at` (timestamp)

2. Security
- RLS enabled, no policies: only the service role (edge functions) can read
  it. The frontend obtains the public key through the authenticated API
  action, never from this table directly.
*/

CREATE TABLE IF NOT EXISTS studio_push_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  public_key text NOT NULL,
  private_key text NOT NULL,
  subject text DEFAULT 'mailto:studio@lstudioana.es',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE studio_push_config ENABLE ROW LEVEL SECURITY;
