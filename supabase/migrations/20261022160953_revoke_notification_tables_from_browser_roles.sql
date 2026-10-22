DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'studio_email_config','studio_whatsapp_config','studio_push_config',
    'studio_email_outbox','studio_whatsapp_outbox','studio_push_outbox',
    'studio_push_subscriptions'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;
