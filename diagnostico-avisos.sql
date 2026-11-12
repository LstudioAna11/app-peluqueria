-- Ejecutar completo en Supabase > SQL Editor. Solo consulta datos de la app.
-- No envía mensajes, no modifica citas y no muestra claves ni comandos del cron.
CREATE TEMP TABLE IF NOT EXISTS studio_notice_diagnostic(section text, data jsonb);
TRUNCATE studio_notice_diagnostic;
DO $$
DECLARE tab text; payload jsonb;
BEGIN
 IF to_regclass('public.studio_email_config') IS NOT NULL THEN
  EXECUTE $q$ SELECT coalesce(jsonb_agg(jsonb_build_object('remitente_configurado',coalesce(to_jsonb(t)->>'from_email','')<>'','clave_email_configurada',coalesce(to_jsonb(t)->>'service_key','')<>'','secreto_worker_configurado',coalesce(to_jsonb(t)->>'worker_secret','')<>'')),'[]'::jsonb) FROM public.studio_email_config t $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('configuracion_email',payload);
 END IF;
 IF to_regclass('public.studio_push_config') IS NOT NULL THEN
  EXECUTE $q$ SELECT coalesce(jsonb_agg(jsonb_build_object('clave_publica_configurada',coalesce(to_jsonb(t)->>'public_key','')<>'','clave_privada_configurada',coalesce(to_jsonb(t)->>'private_key','')<>'','subject_configurado',coalesce(to_jsonb(t)->>'subject','')<>'')),'[]'::jsonb) FROM public.studio_push_config t $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('configuracion_push',payload);
 END IF;
 IF to_regclass('public.studio_appointments') IS NOT NULL THEN
  EXECUTE $q$ SELECT coalesce(jsonb_agg(jsonb_build_object('id',j->>'id','fecha',j->>'starts_at','actualizada',j->>'updated_at','estado',j->>'lifecycle_status','aprobacion',j->>'approval_status','anticipo',j->>'deposit_status','clienta_vinculada',coalesce(j->>'client_id','')<>'')),'[]'::jsonb) FROM (SELECT to_jsonb(t) j FROM public.studio_appointments t ORDER BY coalesce(to_jsonb(t)->>'updated_at',to_jsonb(t)->>'created_at','') DESC LIMIT 10) s $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('ultimas_citas',payload);
 END IF;
 FOREACH tab IN ARRAY ARRAY['studio_email_outbox','studio_notification_jobs','studio_push_outbox'] LOOP
  IF to_regclass('public.'||tab) IS NULL THEN INSERT INTO studio_notice_diagnostic VALUES(tab,jsonb_build_object('tabla','no existe'));CONTINUE;END IF;
  EXECUTE format($q$ SELECT coalesce(jsonb_agg(jsonb_build_object('cita',j->>'appointment_id','canal',j->>'channel','tipo',j->>'kind','estado',j->>'status','intentos',j->>'attempts','programado',j->>'scheduled_at','enviado',coalesce(j->>'sent_at',j->>'delivered_at'),'fecha_esperada',j->>'expected_starts_at','error',left(regexp_replace(regexp_replace(coalesce(j->>'last_error',''),'Bearer[[:space:]]+[^[:space:]]+','Bearer [oculto]','gi'),'(key|secret|token)[[:space:]]*[:=][[:space:]]*[^[:space:],]+','[oculto]','gi'),350))),'[]'::jsonb) FROM (SELECT to_jsonb(t) j FROM public.%I t ORDER BY coalesce(to_jsonb(t)->>'created_at',to_jsonb(t)->>'scheduled_at','') DESC LIMIT 25) s $q$,tab) INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES(tab,payload);
 END LOOP;
 IF to_regclass('public.studio_push_subscriptions') IS NOT NULL THEN
  EXECUTE $q$ SELECT jsonb_build_object('total',count(*),'clientas_distintas',count(distinct to_jsonb(t)->>'client_id')) FROM public.studio_push_subscriptions t $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('suscripciones_push',payload);
 END IF;
 IF to_regclass('cron.job') IS NOT NULL THEN
  EXECUTE $q$ SELECT coalesce(jsonb_agg(jsonb_build_object('id',jobid,'nombre',jobname,'activo',active,'frecuencia',schedule,'llama_email_dispatch',position('/functions/v1/email-dispatch' in command)>0,'llama_studio_email_dispatch',position('/functions/v1/studio-email-dispatch' in command)>0)),'[]'::jsonb) FROM cron.job WHERE command ILIKE '%dispatch%' OR jobname ILIKE '%dispatch%' $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('cron_envios',payload);
 END IF;
 IF to_regclass('net._http_response') IS NOT NULL THEN
  EXECUTE $q$ SELECT coalesce(jsonb_agg(jsonb_build_object('id',j->>'id','http',j->>'status_code','timeout',j->>'timed_out','fecha',j->>'created')),'[]'::jsonb) FROM (SELECT to_jsonb(t) j FROM net._http_response t ORDER BY id DESC LIMIT 15) s $q$ INTO payload;
  INSERT INTO studio_notice_diagnostic VALUES('ultimas_respuestas_http_sin_contenido',payload);
 END IF;
END $$;
SELECT section, data FROM studio_notice_diagnostic ORDER BY section;
