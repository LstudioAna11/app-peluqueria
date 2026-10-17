/*
# Connect portal and admin: API tokens, cross-device identity, availability indexes

1. Purpose
The app previously stored all data only in the browser (localStorage). This migration
completes the existing schema so the portal (client) and 360studio (admin) can share
one database through a server-side edge function.

2. New table: `public.api_tokens`
- `token` (text, primary key): random secret given to the app once it proves it knows
  the admin PIN or a client PIN. Generated server-side, never chosen by users.
- `role` (text): 'admin' or 'client'.
- `client_id` (uuid, nullable): for client tokens, the row in `studio_clients` this
  session belongs to; null for admin tokens.
- `expires_at` (timestamptz): tokens last 12 hours.
- `created_at` (timestamptz).
RLS is enabled and NO policy grants access to anon/authenticated: the table is only
readable/writable by the edge function using the service role.

3. Changed table: `studio_appointments`
- New nullable text column `source_legacy_id`: the browser-side appointment id
  ('Date.now().toString()' style). Lets the app keep using its local ids while the
  server can de-duplicate (unique index on non-null values) and the app can match
  server rows back to local ones.
- New nullable uuid column `client_id` FK to `studio_clients` already existed.

4. New indexes (performance for availability checks)
- `studio_appointments_starts_at_idx` on `studio_appointments (starts_at)`.
- `studio_appointments_client_starts_idx` on `studio_appointments (client_id, starts_at)`.
- `studio_time_blocks_starts_at_idx` on `studio_time_blocks (starts_at)`.

5. Security
- RLS stays ENABLED on every table; no direct table access is granted to
  anon/authenticated. All access flows through the `studio-api` edge function which
  authenticates with the PIN system and uses the service role.
- `api_tokens` grants: none (deny by default).

6. Notes
- No existing column is dropped or type-changed. Data-safe.
*/

CREATE TABLE IF NOT EXISTS public.api_tokens (
  token text PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  client_id uuid REFERENCES public.studio_clients(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '12 hours',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='studio_appointments' AND column_name='source_legacy_id'
  ) THEN
    ALTER TABLE public.studio_appointments ADD COLUMN source_legacy_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS studio_appointments_source_legacy_idx
  ON public.studio_appointments (source_legacy_id)
  WHERE source_legacy_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS studio_appointments_starts_at_idx
  ON public.studio_appointments (starts_at);

CREATE INDEX IF NOT EXISTS studio_appointments_client_starts_idx
  ON public.studio_appointments (client_id, starts_at);

CREATE INDEX IF NOT EXISTS studio_time_blocks_starts_at_idx
  ON public.studio_time_blocks (starts_at);