-- Rotate the worker_secret: generate a fresh 48-char secret and replace the old one.
-- The cron job (studio-email-dispatch) calls studio_generate_worker_secret() which
-- returns the existing value, so it will pick up the new secret automatically.
-- studio-api's kickDispatcher reads worker_secret from the same table.
DO $$
DECLARE
  v_new_secret text;
BEGIN
  SELECT translate(
    encode(gen_random_uuid()::text::bytea, 'base64') || md5(clock_timestamp()::text || random()::text),
    E'+/=\n', ''
  ) INTO v_new_secret;
  v_new_secret := left(v_new_secret, 48);

  UPDATE public.studio_email_config
  SET worker_secret = v_new_secret, updated_at = now()
  WHERE id = true;

  RAISE NOTICE 'worker_secret rotated to % chars', length(v_new_secret);
END $$;