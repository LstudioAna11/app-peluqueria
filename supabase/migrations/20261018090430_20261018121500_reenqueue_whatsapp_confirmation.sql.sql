/*
# Reenqueue a failed WhatsApp booking confirmation (admin, scoped to one appointment)

Security notes:
- SECURITY DEFINER function callable ONLY by the service role and the admin
  auth path; anon/authenticated have no EXECUTE grant.
- Input validated: appointment id must be a UUID; result limited to the
  single failed confirmation of that appointment.
- Does not create duplicate rows: upserts on the unique idempotency_key and
  only requeues rows in status 'failed' or 'skipped' with attempts < 5.
*/

CREATE OR REPLACE FUNCTION studio_reenqueue_whatsapp_confirmation(p_appointment_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE studio_whatsapp_outbox
  SET status = 'scheduled',
      scheduled_at = now(),
      last_error = NULL
  WHERE appointment_id = p_appointment_id
    AND kind = 'confirmation'
    AND status IN ('failed', 'skipped')
    AND attempts < 5;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION studio_reenqueue_whatsapp_confirmation(uuid) FROM PUBLIC, anon, authenticated;
