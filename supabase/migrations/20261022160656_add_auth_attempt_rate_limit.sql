CREATE TABLE IF NOT EXISTS studio_auth_attempts (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE studio_auth_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE studio_auth_attempts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE studio_auth_attempts TO service_role;

CREATE OR REPLACE FUNCTION studio_auth_take_attempt(
  p_bucket text,
  p_limit integer DEFAULT 10,
  p_window_seconds integer DEFAULT 900
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attempts integer;
BEGIN
  INSERT INTO studio_auth_attempts AS a (bucket, attempts, window_start)
  VALUES (p_bucket, 1, now())
  ON CONFLICT (bucket) DO UPDATE
    SET attempts = CASE
          WHEN a.window_start < now() - make_interval(secs => p_window_seconds) THEN 1
          ELSE a.attempts + 1
        END,
        window_start = CASE
          WHEN a.window_start < now() - make_interval(secs => p_window_seconds) THEN now()
          ELSE a.window_start
        END
  RETURNING a.attempts INTO v_attempts;

  RETURN v_attempts <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION studio_auth_take_attempt(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION studio_auth_take_attempt(text, integer, integer) TO service_role;
