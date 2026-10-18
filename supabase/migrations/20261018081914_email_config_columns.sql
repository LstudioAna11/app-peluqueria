/*
# Email configuration columns

1. Purpose
Configuration for the phase-1 automatic email notifications.

2. Modified table: `studio_email_config` (new columns)
- `worker_secret` (text): shared secret the database scheduler presents when
  triggering the email worker. Generated server-side; never exposed to clients.
- `portal_url` (text, nullable): public portal address used in email buttons
  ("Ver mi cita"). Filled automatically from app requests.
- `from_email` (text, nullable): sender identity. NULL until a provider and
  verified sender exist.
- `provider` (text, nullable): email provider name ('resend'). NULL means not
  configured; the worker reports pending configuration to 360Studio.

3. New function
- `public.studio_generate_worker_secret()` (SECURITY DEFINER): generates the
  worker secret once. Revoked from anon/authenticated.

4. Security
- ADD COLUMN only; no data is changed or dropped. RLS unchanged (no
  anon/authenticated access; service-role server code only).
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='studio_email_config' AND column_name='worker_secret') THEN
    ALTER TABLE public.studio_email_config ADD COLUMN worker_secret text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='studio_email_config' AND column_name='portal_url') THEN
    ALTER TABLE public.studio_email_config ADD COLUMN portal_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='studio_email_config' AND column_name='from_email') THEN
    ALTER TABLE public.studio_email_config ADD COLUMN from_email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='studio_email_config' AND column_name='provider') THEN
    ALTER TABLE public.studio_email_config ADD COLUMN provider text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.studio_generate_worker_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT worker_secret INTO v_secret FROM public.studio_email_config WHERE id = true;
  IF v_secret IS NULL THEN
    v_secret := encode(gen_random_bytes(24), 'hex');
    UPDATE public.studio_email_config SET worker_secret = v_secret WHERE id = true;
  END IF;
  RETURN v_secret;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.studio_generate_worker_secret() FROM anon, authenticated;