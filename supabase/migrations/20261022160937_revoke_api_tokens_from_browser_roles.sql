REVOKE ALL ON TABLE api_tokens FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE api_tokens TO service_role;
