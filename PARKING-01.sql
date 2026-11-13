BEGIN;
CREATE TABLE IF NOT EXISTS public.studio_parking_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), initialized boolean NOT NULL DEFAULT false,
 min_minutes integer NOT NULL DEFAULT 90 CHECK(min_minutes BETWEEN 30 AND 480 AND min_minutes%5=0)
);
INSERT INTO public.studio_parking_settings(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.studio_parking_deliveries (
 appointment_id uuid PRIMARY KEY, issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), returned_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.studio_parking_operations (
 operation_id uuid PRIMARY KEY, fingerprint jsonb NOT NULL, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.studio_parking_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, operation_id uuid UNIQUE NOT NULL REFERENCES public.studio_parking_operations(operation_id),
 action text NOT NULL CHECK(action IN('initialize','restock','issue','return')), delta integer NOT NULL CHECK(delta BETWEEN -1 AND 100000),
 appointment_id uuid, reason text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((action='issue' AND delta=-1 AND appointment_id IS NOT NULL) OR (action='return' AND delta=1 AND appointment_id IS NOT NULL) OR (action='initialize' AND delta>=0 AND appointment_id IS NULL) OR (action='restock' AND delta>0 AND appointment_id IS NULL))
);
ALTER TABLE public.studio_parking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_parking_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_parking_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_parking_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.studio_parking_settings,public.studio_parking_deliveries,public.studio_parking_operations,public.studio_parking_ledger FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.studio_parking_state_v1(p_reference text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.studio_parking_settings; a record; delivery public.studio_parking_deliveries; stock bigint; ledger jsonb; eligible boolean:=false;
BEGIN
 SELECT * INTO STRICT cfg FROM public.studio_parking_settings WHERE id=true;
 SELECT coalesce(sum(delta),0) INTO stock FROM public.studio_parking_ledger;
 IF p_reference IS NOT NULL THEN
  SELECT id,duration_minutes,lifecycle_status,approval_status INTO a FROM public.studio_appointments
   WHERE id::text=p_reference OR source_legacy_id=p_reference;
  IF FOUND THEN
   eligible:=coalesce(a.duration_minutes,0)>=cfg.min_minutes AND coalesce(a.lifecycle_status,'active') NOT IN('cancelled','no_show') AND coalesce(a.approval_status,'not_required')<>'rejected';
   SELECT * INTO delivery FROM public.studio_parking_deliveries WHERE appointment_id=a.id;
  END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) INTO ledger FROM (
  SELECT action,delta,created_at AS at,appointment_id,reason FROM public.studio_parking_ledger ORDER BY id DESC LIMIT 20
 ) q;
 RETURN jsonb_build_object('initialized',cfg.initialized,'minMinutes',cfg.min_minutes,'courtesyMinutes',60,'stock',CASE WHEN cfg.initialized THEN stock ELSE NULL END,
  'lowStock',cfg.initialized AND stock<=10,'alertAt',10,'eligible',eligible,'delivered',delivery.appointment_id IS NOT NULL AND delivery.returned_at IS NULL,
  'deliveredAt',CASE WHEN delivery.returned_at IS NULL THEN delivery.issued_at ELSE NULL END,
  'added',coalesce((SELECT sum(delta) FROM public.studio_parking_ledger WHERE action IN('initialize','restock')),0),
  'deliveredTotal',(SELECT count(*) FROM public.studio_parking_deliveries WHERE returned_at IS NULL),'history',ledger);
END $$;

CREATE OR REPLACE FUNCTION public.studio_parking_admin_v1(p_actor text,p_action text,p_request uuid DEFAULT NULL,p_reference text DEFAULT NULL,p_amount integer DEFAULT NULL,p_minimum integer DEFAULT NULL,p_reason text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg public.studio_parking_settings; stock bigint; previous jsonb; fingerprint jsonb; a record; delivery public.studio_parking_deliveries;
BEGIN
 IF p_actor IS NULL OR p_actor!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'PARKING_ACTOR';END IF;
 IF p_action NOT IN('state','initialize','restock','issue','return','settings') OR p_action IS NULL THEN RAISE EXCEPTION 'PARKING_ACTION';END IF;
 IF p_reference IS NOT NULL AND (length(p_reference)>80 OR p_reference!~'^[A-Za-z0-9_-]+$') THEN RAISE EXCEPTION 'PARKING_REFERENCE';END IF;
 SELECT * INTO STRICT cfg FROM public.studio_parking_settings WHERE id=true FOR UPDATE;
 IF p_action='state' THEN RETURN public.studio_parking_state_v1(p_reference);END IF;
 IF p_request IS NULL THEN RAISE EXCEPTION 'PARKING_REQUEST';END IF;
 fingerprint:=jsonb_build_object('action',p_action,'reference',p_reference,'amount',p_amount,'minimum',p_minimum,'reason',p_reason);
 SELECT o.fingerprint INTO previous FROM public.studio_parking_operations o WHERE operation_id=p_request;
 IF FOUND THEN
  IF previous<>fingerprint THEN RAISE EXCEPTION 'PARKING_REQUEST_CHANGED';END IF;
  RETURN public.studio_parking_state_v1(p_reference)||jsonb_build_object('replayed',true);
 END IF;
 SELECT coalesce(sum(delta),0) INTO stock FROM public.studio_parking_ledger;
 IF p_action IN('initialize','restock') THEN
  IF p_amount IS NULL OR p_amount<(CASE WHEN p_action='initialize' THEN 0 ELSE 1 END) OR p_amount>100000 THEN RAISE EXCEPTION 'PARKING_QUANTITY';END IF;
  IF p_action='initialize' AND cfg.initialized THEN RAISE EXCEPTION 'PARKING_ALREADY_INITIALIZED';END IF;
  IF p_action='restock' AND NOT cfg.initialized THEN RAISE EXCEPTION 'PARKING_NOT_INITIALIZED';END IF;
  INSERT INTO public.studio_parking_operations(operation_id,fingerprint,actor) VALUES(p_request,fingerprint,p_actor);
  INSERT INTO public.studio_parking_ledger(operation_id,action,delta) VALUES(p_request,p_action,p_amount);
  IF p_action='initialize' THEN UPDATE public.studio_parking_settings SET initialized=true WHERE id=true;END IF;
 ELSIF p_action='settings' THEN
  IF p_minimum IS NULL OR p_minimum NOT BETWEEN 30 AND 480 OR p_minimum%5<>0 THEN RAISE EXCEPTION 'PARKING_MINIMUM';END IF;
  INSERT INTO public.studio_parking_operations(operation_id,fingerprint,actor) VALUES(p_request,fingerprint,p_actor);
  UPDATE public.studio_parking_settings SET min_minutes=p_minimum WHERE id=true;
 ELSE
  IF NOT cfg.initialized THEN RAISE EXCEPTION 'PARKING_NOT_INITIALIZED';END IF;
  SELECT id,duration_minutes,lifecycle_status,approval_status INTO a FROM public.studio_appointments WHERE id::text=p_reference OR source_legacy_id=p_reference FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PARKING_APPOINTMENT';END IF;
  SELECT * INTO delivery FROM public.studio_parking_deliveries WHERE appointment_id=a.id;
  IF p_action='issue' THEN
   IF delivery.appointment_id IS NOT NULL AND delivery.returned_at IS NULL THEN INSERT INTO public.studio_parking_operations(operation_id,fingerprint,actor) VALUES(p_request,fingerprint,p_actor);RETURN public.studio_parking_state_v1(p_reference);END IF;
   IF coalesce(a.duration_minutes,0)<cfg.min_minutes OR coalesce(a.lifecycle_status,'active') IN('cancelled','no_show') OR coalesce(a.approval_status,'not_required')='rejected' THEN RAISE EXCEPTION 'PARKING_NOT_ELIGIBLE';END IF;
   IF stock<1 THEN RAISE EXCEPTION 'PARKING_EMPTY';END IF;
   INSERT INTO public.studio_parking_operations(operation_id,fingerprint,actor) VALUES(p_request,fingerprint,p_actor);
   INSERT INTO public.studio_parking_ledger(operation_id,action,delta,appointment_id) VALUES(p_request,'issue',-1,a.id);
   INSERT INTO public.studio_parking_deliveries(appointment_id) VALUES(a.id) ON CONFLICT(appointment_id) DO UPDATE SET issued_at=clock_timestamp(),returned_at=NULL;
  ELSE
   IF delivery.appointment_id IS NULL OR delivery.returned_at IS NOT NULL THEN RAISE EXCEPTION 'PARKING_NOT_DELIVERED';END IF;
   IF p_reason IS NULL OR length(trim(p_reason))<3 OR length(p_reason)>200 THEN RAISE EXCEPTION 'PARKING_REASON';END IF;
   INSERT INTO public.studio_parking_operations(operation_id,fingerprint,actor) VALUES(p_request,fingerprint,p_actor);
   INSERT INTO public.studio_parking_ledger(operation_id,action,delta,appointment_id,reason) VALUES(p_request,'return',1,a.id,trim(p_reason));
   UPDATE public.studio_parking_deliveries SET returned_at=clock_timestamp() WHERE appointment_id=a.id;
  END IF;
 END IF;
 RETURN public.studio_parking_state_v1(p_reference);
END $$;
REVOKE ALL ON FUNCTION public.studio_parking_state_v1(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.studio_parking_admin_v1(text,text,uuid,text,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.studio_parking_admin_v1(text,text,uuid,text,integer,integer,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
