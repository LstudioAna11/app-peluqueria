-- F2: the worker secret gates the dispatch function; browsers must not read it.
REVOKE ALL ON FUNCTION public.studio_generate_worker_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studio_generate_worker_secret() FROM anon;
REVOKE ALL ON FUNCTION public.studio_generate_worker_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.studio_generate_worker_secret() TO service_role;