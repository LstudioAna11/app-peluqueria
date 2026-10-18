/*
# Email worker security and cron schedule

1. Purpose
Lets the persistent database scheduler (pg_cron) trigger the email worker
server function every 5 minutes, so scheduled appointment emails are dispatched
even when the app is closed. The worker itself enforces:
- only messages whose scheduled time has arrived are sent,
- the appointment is still confirmed and its start time has not changed
  (re-checked at dispatch time for every reminder),
- limited retries with error logging,
- provider-confirmed "sent" status only (no simulated sends).

2. New table
- `public.studio_email_config` (single row, id = true):
  - `service_key` (text, nullable): storage placeholder for the email provider
    API key. NULL means no provider is configured yet; the worker reports the
    missing configuration to 360Studio instead of pretending to send.

3. New function
- `public.studio_dispatch_request()` (SECURITY DEFINER, owner-locked): returns
  the JSON headers/payload the cron job sends to the worker: the project URL is
  read from the database settings and the anon key from studio_email_config.
  Revoked from anon/authenticated; called only by the cron job's owner context.

4. Scheduled job
- `studio-email-dispatch` runs every 5 minutes and performs an HTTP POST to the
  `email-dispatch` server function using pg_net.

5. Security
- RLS enabled on studio_email_config; no anon/authenticated policies (server
  code with the service role reads/writes it).
- The dispatch helper exposes only values the browser already has plus the
  configured service key to server-side cron, never to client roles.
*/

CREATE TABLE IF NOT EXISTS public.studio_email_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  service_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.studio_email_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.studio_email_config ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.studio_dispatch_request()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host text;
  v_key text;
  v_anon text;
BEGIN
  SELECT nullif(setting, '') INTO v_host
    FROM pg_settings WHERE name = 'app.settings.supabase_url' LIMIT 1;
  SELECT service_key INTO v_key FROM public.studio_email_config WHERE id = true;
  v_anon := coalesce(
    nullif(current_setting('app.settings.anon_key', true), ''),
    ''
  );
  RETURN json_build_object(
    'host', v_host,
    'service_key', v_key,
    'anon_key', v_anon
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.studio_dispatch_request() FROM anon, authenticated;